/**
 * Pinterest API v5 client for Moon Raven Designs.
 *
 * This is the foundational module the OAuth init + scheduler + backlog scripts
 * all import from. It handles:
 *
 *   - Token persistence to .env.pinterest (gitignored)
 *   - Access-token refresh via long-lived refresh_token
 *   - One `pinterestFetch()` helper that:
 *       - injects the Bearer token,
 *       - on 401 → refreshes once and retries,
 *       - on 429 → sleeps Retry-After then retries (one attempt),
 *       - parses JSON or throws with the response body.
 *   - Typed wrappers: listBoards, createBoard, createPin.
 *
 * It does NOT mint a fresh OAuth code flow — that's the job of
 * pinterest-oauth-init.ts. This module assumes refresh_token already exists
 * in .env.pinterest. If it doesn't, every call throws a clear message
 * telling the operator to run the init script first.
 *
 * No external deps — uses Node's global fetch and node:fs only.
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Paths & env file ───────────────────────────────────────────────────────

const ENV_FILE = path.resolve(process.cwd(), '.env.pinterest');

// ─── Pinterest API URLs ─────────────────────────────────────────────────────
//
// Pinterest v5 splits the OAuth surface across two hosts:
//   - Consent screen lives on www.pinterest.com (user-facing redirect)
//   - Token exchange + API calls live on api.pinterest.com
//
// These constants are exported so the init script can compose the consent
// URL without duplicating the host string.

export const PINTEREST_AUTH_URL = 'https://www.pinterest.com/oauth/';
export const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
export const PINTEREST_TOKEN_URL = `${PINTEREST_API_BASE}/oauth/token`;

// Scopes we need:
//   boards:read   — list boards to find the target board id
//   boards:write  — create boards on first run if missing
//   pins:read     — re-fetch a pin to verify it published
//   pins:write    — POST /v5/pins (the only mutation we actually use)
//
// `user_accounts:read` is NOT required for posting pins; we deliberately
// omit it to keep the consent screen minimal.
export const PINTEREST_SCOPES = ['boards:read', 'boards:write', 'pins:read', 'pins:write'] as const;

// ─── .env.pinterest read/write ──────────────────────────────────────────────
//
// We use a plain KEY=value file rather than dotenv to avoid a runtime dep.
// All keys are written single-line; values are trimmed. Comments and blank
// lines are preserved on read.

export type PinterestEnv = {
  PINTEREST_APP_ID: string;
  PINTEREST_APP_SECRET: string;
  PINTEREST_REDIRECT_URI: string;
  PINTEREST_REFRESH_TOKEN: string;
  // Cached access token + expiry — saves a token call per cron invocation.
  PINTEREST_ACCESS_TOKEN?: string;
  PINTEREST_ACCESS_TOKEN_EXPIRES_AT?: string; // ISO timestamp
};

const REQUIRED_KEYS: ReadonlyArray<keyof PinterestEnv> = [
  'PINTEREST_APP_ID',
  'PINTEREST_APP_SECRET',
  'PINTEREST_REDIRECT_URI',
];

export function loadEnv(): Partial<PinterestEnv> {
  if (!fs.existsSync(ENV_FILE)) return {};
  const raw = fs.readFileSync(ENV_FILE, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    out[key] = val;
  }
  // Also fall back to process.env for app id/secret/redirect — useful in CI
  // where the operator may prefer to set them as secrets rather than as a file.
  for (const k of REQUIRED_KEYS) {
    if (!out[k] && process.env[k]) out[k] = process.env[k] as string;
  }
  return out as Partial<PinterestEnv>;
}

/**
 * Save a partial set of keys back to .env.pinterest. Keys not passed in are
 * preserved from the existing file. This is what gets called after a token
 * refresh so the new access_token survives across cron invocations.
 */
export function saveEnv(updates: Partial<PinterestEnv>): void {
  const existing = loadEnv();
  const merged = { ...existing, ...updates };
  const lines: string[] = [
    '# Pinterest API v5 credentials — DO NOT COMMIT',
    '# Generated/updated by scripts/pinterest-client.ts',
    '',
  ];
  const ordered: ReadonlyArray<keyof PinterestEnv> = [
    'PINTEREST_APP_ID',
    'PINTEREST_APP_SECRET',
    'PINTEREST_REDIRECT_URI',
    'PINTEREST_REFRESH_TOKEN',
    'PINTEREST_ACCESS_TOKEN',
    'PINTEREST_ACCESS_TOKEN_EXPIRES_AT',
  ];
  for (const k of ordered) {
    const v = merged[k];
    if (v !== undefined && v !== '') lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 });
}

function assertCredentials(env: Partial<PinterestEnv>): asserts env is PinterestEnv {
  const missing = REQUIRED_KEYS.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Pinterest credentials missing: ${missing.join(', ')}. ` +
        `Run \`npx tsx scripts/pinterest-oauth-init.ts\` once to set them.`,
    );
  }
  if (!env.PINTEREST_REFRESH_TOKEN) {
    throw new Error(
      'PINTEREST_REFRESH_TOKEN missing — run `npx tsx scripts/pinterest-oauth-init.ts` to grant consent.',
    );
  }
}

// ─── Token lifecycle ────────────────────────────────────────────────────────

type TokenResponse = {
  access_token: string;
  // Pinterest's v5 token response includes a fresh refresh_token only when
  // refresh_token rotation is enabled on the app. We treat it as optional;
  // if returned, we persist the new one.
  refresh_token?: string;
  expires_in: number; // seconds
  refresh_token_expires_in?: number;
  token_type: 'bearer';
  scope: string;
};

/**
 * Exchange refresh_token for a fresh access_token. Persists both the new
 * access token (with expiry) and a rotated refresh token if Pinterest sent one.
 *
 * Exposed so the init script can also call it to mint the FIRST access token
 * after the authorization_code exchange.
 */
export async function refreshAccessToken(): Promise<string> {
  const env = loadEnv();
  assertCredentials(env);

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.PINTEREST_REFRESH_TOKEN,
    scope: PINTEREST_SCOPES.join(' '),
  });

  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(env.PINTEREST_APP_ID, env.PINTEREST_APP_SECRET)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinterest token refresh failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
  saveEnv({
    PINTEREST_ACCESS_TOKEN: json.access_token,
    PINTEREST_ACCESS_TOKEN_EXPIRES_AT: expiresAt,
    ...(json.refresh_token ? { PINTEREST_REFRESH_TOKEN: json.refresh_token } : {}),
  });
  return json.access_token;
}

/**
 * Exchange an authorization_code for the initial refresh_token + access_token.
 * Only used by pinterest-oauth-init.ts on first setup.
 */
export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const env = loadEnv();
  if (!env.PINTEREST_APP_ID || !env.PINTEREST_APP_SECRET || !env.PINTEREST_REDIRECT_URI) {
    throw new Error('PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REDIRECT_URI must be set first');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.PINTEREST_REDIRECT_URI,
  });
  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(env.PINTEREST_APP_ID, env.PINTEREST_APP_SECRET)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinterest code exchange failed ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as TokenResponse;
  if (!json.refresh_token) {
    throw new Error(
      'Pinterest returned no refresh_token. Ensure the app has refresh_token rotation enabled ' +
        'and that the consent URL included `scope=...&response_type=code`.',
    );
  }
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
  saveEnv({
    PINTEREST_ACCESS_TOKEN: json.access_token,
    PINTEREST_REFRESH_TOKEN: json.refresh_token,
    PINTEREST_ACCESS_TOKEN_EXPIRES_AT: expiresAt,
  });
  return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

function basicAuth(id: string, secret: string): string {
  return Buffer.from(`${id}:${secret}`).toString('base64');
}

/**
 * Return a valid access token. Uses the cached one if it still has > 60s left,
 * otherwise calls refresh_token. Network-free in the happy path.
 */
async function getAccessToken(): Promise<string> {
  const env = loadEnv();
  assertCredentials(env);
  const cached = env.PINTEREST_ACCESS_TOKEN;
  const expiresAt = env.PINTEREST_ACCESS_TOKEN_EXPIRES_AT;
  if (cached && expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - Date.now();
    if (msLeft > 60_000) return cached;
  }
  return refreshAccessToken();
}

// ─── pinterestFetch — the one gateway every API call goes through ────────────
//
// Behavior:
//   - Injects Authorization: Bearer <access_token>
//   - On 401 once: refresh and retry exactly once (handles a server-side
//     token invalidation that doesn't match our cached expiry).
//   - On 429 once: sleeps Retry-After (or 60s default) and retries once.
//   - On other non-2xx: throws with status + first 500 chars of body.
//   - Parses JSON response. Returns undefined for 204.

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  // Internal — prevents infinite retry loops.
  _retried401?: boolean;
  _retried429?: boolean;
};

export async function pinterestFetch<T = unknown>(
  pathOrUrl: string,
  opts: FetchOptions = {},
): Promise<T> {
  const url = buildUrl(pathOrUrl, opts.query);
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body,
  });

  // 401 → refresh once and retry. Note: refreshAccessToken() rewrites
  // .env.pinterest, so the next getAccessToken() call returns the new one.
  if (res.status === 401 && !opts._retried401) {
    await refreshAccessToken();
    return pinterestFetch<T>(pathOrUrl, { ...opts, _retried401: true });
  }

  // 429 → respect Retry-After. Pinterest sets it in seconds.
  if (res.status === 429 && !opts._retried429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? '60');
    const waitMs = Math.min(Math.max(retryAfter, 1), 300) * 1000;
    console.warn(`[pinterest] 429 rate-limited; sleeping ${waitMs / 1000}s before retry`);
    await sleep(waitMs);
    return pinterestFetch<T>(pathOrUrl, { ...opts, _retried429: true });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Pinterest ${res.status} on ${opts.method ?? 'GET'} ${url}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Pinterest returned non-JSON body (${res.status}): ${text.slice(0, 200)}`);
  }
}

function buildUrl(pathOrUrl: string, query?: Record<string, string | number | undefined>): string {
  const base = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${PINTEREST_API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  if (!query) return base;
  const url = new URL(base);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Typed wrappers ─────────────────────────────────────────────────────────

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface PinterestPin {
  id: string;
  board_id: string;
  title?: string;
  description?: string;
  link?: string;
  media_source?: unknown;
}

export async function listBoards(): Promise<PinterestBoard[]> {
  type BoardsPage = { items: PinterestBoard[]; bookmark?: string | null };
  const all: PinterestBoard[] = [];
  let bookmark: string | undefined;
  let pages = 0;
  // Cap at 20 pages (Pinterest defaults to 25 per page → 500 boards max).
  // We have ~6 boards; this is a paranoid stop, not a real limit.
  do {
    const page = await pinterestFetch<BoardsPage>('/boards', {
      query: { page_size: 100, bookmark },
    });
    all.push(...page.items);
    bookmark = page.bookmark ?? undefined;
    pages += 1;
  } while (bookmark && pages < 20);
  return all;
}

export async function createBoard(
  name: string,
  description?: string,
  privacy: 'PUBLIC' | 'SECRET' = 'PUBLIC',
): Promise<PinterestBoard> {
  return pinterestFetch<PinterestBoard>('/boards', {
    method: 'POST',
    body: { name, description: description ?? '', privacy },
  });
}

/**
 * Find a board by exact name (case-insensitive), creating it if missing.
 * Used by the scheduler so each run can self-heal the board layout on a
 * fresh Pinterest account.
 */
export async function ensureBoard(name: string, description?: string): Promise<PinterestBoard> {
  const boards = await listBoards();
  const match = boards.find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (match) return match;
  return createBoard(name, description);
}

export interface CreatePinInput {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  altText?: string;
}

/**
 * POST /v5/pins. Returns the created pin's id so the scheduler can stamp
 * it back onto the backlog entry.
 */
export async function createPin(input: CreatePinInput): Promise<PinterestPin> {
  // Pinterest v5 caps:
  //   title       ≤ 100 chars
  //   description ≤ 500 chars
  //   alt_text    ≤ 500 chars
  // We hard-truncate here as a last line of defense; the backlog builder
  // also enforces these so this should normally be a no-op.
  return pinterestFetch<PinterestPin>('/pins', {
    method: 'POST',
    body: {
      board_id: input.boardId,
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 500),
      link: input.link,
      alt_text: (input.altText ?? input.title).slice(0, 500),
      media_source: {
        source_type: 'image_url',
        url: input.imageUrl,
      },
    },
  });
}

// ─── Shared types for the backlog file ──────────────────────────────────────
//
// pinterest-backlog.ts produces this shape; pinterest-schedule.ts consumes it.
// Defined here so both scripts stay in lockstep without a third module.

export type BacklogStatus = 'pending' | 'posted' | 'failed' | 'skipped';

export interface BacklogEntry {
  /** Stable id we generate (slug + index) so re-runs are idempotent. */
  id: string;
  /** Which board name to post to — resolved to id at post time. */
  boardName: string;
  title: string;
  description: string;
  /** Destination URL on moonraven.com — what Pinterest opens when the pin is clicked. */
  link: string;
  imageUrl: string;
  altText: string;
  /** Up to 6 hashtags (without the # prefix). The scheduler appends them to description. */
  hashtags: string[];
  /** ISO timestamp — earliest time the scheduler may post this. */
  scheduledFor: string;
  /** Source — for debugging/audit. */
  source: { kind: 'product'; handle: string } | { kind: 'pseo'; pageType: string; slug: string };
  status: BacklogStatus;
  /** Filled in after a successful post. */
  pinId?: string;
  postedAt?: string;
  lastError?: string;
}

export interface Backlog {
  generatedAt: string;
  entries: BacklogEntry[];
}

export const BACKLOG_PATH = path.resolve(process.cwd(), 'scripts/pinterest-backlog.json');

export function readBacklog(): Backlog {
  if (!fs.existsSync(BACKLOG_PATH)) {
    return { generatedAt: new Date().toISOString(), entries: [] };
  }
  const raw = fs.readFileSync(BACKLOG_PATH, 'utf8');
  return JSON.parse(raw) as Backlog;
}

export function writeBacklog(backlog: Backlog): void {
  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2) + '\n');
}
