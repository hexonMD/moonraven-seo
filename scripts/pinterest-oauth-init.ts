/**
 * One-shot OAuth bootstrap for Pinterest API v5.
 *
 * Flow:
 *   1. Prompt operator for PINTEREST_APP_ID + PINTEREST_APP_SECRET if not set.
 *      Save them (plus the redirect URI) to .env.pinterest.
 *   2. Print the consent URL. Operator clicks → Pinterest consent screen →
 *      Pinterest redirects to http://localhost:8765/callback?code=...&state=...
 *   3. We run a tiny Node http server on :8765 just long enough to capture
 *      the code. State token check guards against CSRF.
 *   4. Exchange code → refresh_token + access_token via the client module.
 *      The client module writes both to .env.pinterest.
 *   5. Verify by calling listBoards() — this confirms the token works AND
 *      tells the operator which boards already exist.
 *
 * Re-running this script is safe — it generates a new refresh_token and
 * overwrites the old one. Existing access tokens are invalidated by Pinterest
 * server-side when the refresh_token rotates.
 *
 * Usage:
 *   npx tsx scripts/pinterest-oauth-init.ts
 *
 * No CLI args. Reads/writes .env.pinterest in CWD.
 */

import http from 'node:http';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  exchangeAuthorizationCode,
  listBoards,
  loadEnv,
  saveEnv,
  PINTEREST_AUTH_URL,
  PINTEREST_SCOPES,
  type PinterestEnv,
} from './pinterest-client.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const REDIRECT_PORT = 8765;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const STATE = crypto.randomBytes(16).toString('hex');

// ─── Prompting helpers ──────────────────────────────────────────────────────

async function promptIfMissing(env: Partial<PinterestEnv>): Promise<PinterestEnv> {
  // We accept env vars from process.env OR a previous .env.pinterest run.
  // Anything still missing, we prompt interactively.
  if (env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET) {
    // Always force the redirect URI to match this script's listener.
    return {
      PINTEREST_APP_ID: env.PINTEREST_APP_ID,
      PINTEREST_APP_SECRET: env.PINTEREST_APP_SECRET,
      PINTEREST_REDIRECT_URI: REDIRECT_URI,
      PINTEREST_REFRESH_TOKEN: env.PINTEREST_REFRESH_TOKEN ?? '',
      PINTEREST_ACCESS_TOKEN: env.PINTEREST_ACCESS_TOKEN,
      PINTEREST_ACCESS_TOKEN_EXPIRES_AT: env.PINTEREST_ACCESS_TOKEN_EXPIRES_AT,
    };
  }

  console.log('');
  console.log('─── Pinterest app credentials ────────────────────────────────');
  console.log('Create an app at https://developers.pinterest.com/apps/');
  console.log('Then paste the App ID and Secret below.');
  console.log('Set redirect URI on the app page to:');
  console.log(`    ${REDIRECT_URI}`);
  console.log('');

  const rl = readline.createInterface({ input, output });
  try {
    const appId = (await rl.question('PINTEREST_APP_ID: ')).trim();
    const appSecret = (await rl.question('PINTEREST_APP_SECRET: ')).trim();
    if (!appId || !appSecret) throw new Error('Both fields are required');
    return {
      PINTEREST_APP_ID: appId,
      PINTEREST_APP_SECRET: appSecret,
      PINTEREST_REDIRECT_URI: REDIRECT_URI,
      PINTEREST_REFRESH_TOKEN: '',
    };
  } finally {
    rl.close();
  }
}

// ─── Local listener ─────────────────────────────────────────────────────────
//
// We deliberately do NOT pull in Express. The native http module is one line
// shorter and avoids a build-time dep. The server lives for one request, then
// shuts itself down.

type CallbackResult = { code: string };

function waitForCallback(timeoutMs = 5 * 60_000): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end('No URL');
        return;
      }
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Pinterest returns ?error=access_denied if the user clicks "Cancel".
      if (error) {
        respondHtml(res, `<h2>Authorization failed</h2><p>${error}</p>`);
        cleanup();
        reject(new Error(`Pinterest returned error: ${error}`));
        return;
      }
      if (state !== STATE) {
        respondHtml(res, '<h2>State mismatch — possible CSRF. Aborting.</h2>');
        cleanup();
        reject(new Error('State parameter mismatch'));
        return;
      }
      if (!code) {
        respondHtml(res, '<h2>No code in callback</h2>');
        cleanup();
        reject(new Error('No code parameter'));
        return;
      }
      respondHtml(
        res,
        '<h2>Pinterest connected.</h2><p>You can close this tab and return to the terminal.</p>',
      );
      cleanup();
      resolve({ code });
    });

    let cleaned = false;
    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      // Allow the response to flush before closing.
      setTimeout(() => server.close(), 250);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs / 1000}s waiting for Pinterest callback`));
    }, timeoutMs);

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      // Listener ready.
    });
    server.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

function respondHtml(res: http.ServerResponse, body: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    `<!doctype html><html><head><meta charset="utf-8"><title>Moon Raven · Pinterest</title>` +
      `<style>body{font-family:system-ui;background:#FCFBF9;color:#1a1a1a;padding:48px;max-width:560px;margin:auto;line-height:1.5}` +
      `h2{font-weight:600;letter-spacing:0.02em}</style></head><body>${body}</body></html>`,
  );
}

// ─── Consent URL builder ────────────────────────────────────────────────────

function buildConsentUrl(appId: string, redirectUri: string): string {
  const url = new URL(PINTEREST_AUTH_URL);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', PINTEREST_SCOPES.join(','));
  url.searchParams.set('state', STATE);
  return url.toString();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Pinterest OAuth init — Moon Raven Designs');
  console.log('');

  const existing = loadEnv();
  const env = await promptIfMissing(existing);

  // Persist credentials + redirect URI before kicking off the consent dance
  // so a Ctrl-C mid-flow doesn't lose the App ID/Secret operator just typed.
  saveEnv({
    PINTEREST_APP_ID: env.PINTEREST_APP_ID,
    PINTEREST_APP_SECRET: env.PINTEREST_APP_SECRET,
    PINTEREST_REDIRECT_URI: REDIRECT_URI,
  });

  const consentUrl = buildConsentUrl(env.PINTEREST_APP_ID, REDIRECT_URI);
  console.log('');
  console.log('─── Step 1 of 2: grant consent ───────────────────────────────');
  console.log('Open this URL in your browser and click "Continue":');
  console.log('');
  console.log(`    ${consentUrl}`);
  console.log('');
  console.log(`Listening on ${REDIRECT_URI} for Pinterest's redirect-back...`);
  console.log('(Times out after 5 minutes.)');
  console.log('');

  const { code } = await waitForCallback();
  console.log('');
  console.log('─── Step 2 of 2: exchange code for tokens ────────────────────');
  console.log(`Received auth code (${code.slice(0, 12)}...). Exchanging for tokens...`);

  const { refreshToken } = await exchangeAuthorizationCode(code);
  console.log(`refresh_token saved to .env.pinterest (${refreshToken.slice(0, 12)}...)`);
  console.log('');

  console.log('Verifying token by listing boards...');
  const boards = await listBoards();
  console.log(`  Found ${boards.length} existing board(s):`);
  for (const b of boards) {
    console.log(`    - ${b.name} (${b.id})`);
  }
  console.log('');
  console.log('Done. You can now run:');
  console.log('  npx tsx scripts/pinterest-backlog.ts          # seed the backlog');
  console.log('  npx tsx scripts/pinterest-schedule.ts --dry-run  # preview what would post');
}

main().catch((err: unknown) => {
  console.error('');
  console.error('OAuth init failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
