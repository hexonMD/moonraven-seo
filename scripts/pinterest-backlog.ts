/**
 * Build scripts/pinterest-backlog.json from Shopify products + pSEO pages.
 *
 * Output:
 *   scripts/pinterest-backlog.json — array of BacklogEntry objects, each
 *   ready for pinterest-schedule.ts to post.
 *
 * Run:
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... \
 *     npx tsx scripts/pinterest-backlog.ts
 *
 * Flags:
 *   --limit N      cap products pulled (default: all)
 *   --per-day N    pins to schedule per day (default: 4; range 3-5)
 *   --start ISO    first day to schedule (default: tomorrow morning, 10:00 local)
 *   --pseo-only    skip products, only build pSEO entries
 *   --products-only skip pSEO, only build product entries
 *   --merge        append to existing backlog (skip ids that already exist)
 *
 * IMPORTANT: this script never calls Pinterest. It only builds the JSON
 * backlog file. Posting is pinterest-schedule.ts's job.
 *
 * Voice rules (Moon Raven):
 *   - quiet, intentional, no exclamation marks, no hype words ("amazing",
 *     "stunning", "best ever"). The captionFor* functions below enforce
 *     this with a sanitize pass.
 *   - hashtags: 4-6 only. Pinterest punishes hashtag spam.
 *   - title: ≤ 100 chars (Pinterest hard limit).
 *   - description: ≤ 500 chars (Pinterest hard limit), ends with a soft CTA.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SYMBOLS } from '../src/lib/symbolism-config.js';
import { MEMORIALS } from '../src/lib/memorial-config.js';
import { MATERIALS } from '../src/lib/materials-config.js';
import {
  BACKLOG_PATH,
  readBacklog,
  writeBacklog,
  type Backlog,
  type BacklogEntry,
} from './pinterest-client.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

// Boards Moon Raven uses on Pinterest. The scheduler creates any of these
// that don't yet exist (via ensureBoard). Names are user-facing; keep them
// human-readable and capitalized.
export const BOARDS = {
  TALISMANIC: 'Talismanic Jewelry',
  MEMORIAL: 'Memorial Keepsakes',
  WILDLIFE: 'Wildlife Jewelry',
  SYMBOLISM: 'Symbolism & Meaning',
  SILVER: 'Handcrafted Silver',
  BRONZE: 'Handcrafted Bronze',
} as const;

type BoardName = (typeof BOARDS)[keyof typeof BOARDS];

// CLI args
const argv = process.argv.slice(2);
const argFlag = (name: string): boolean => argv.includes(name);
const argValue = (name: string): string | undefined => {
  const idx = argv.indexOf(name);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
};
const LIMIT = Number(argValue('--limit') ?? '0') || Infinity;
const PER_DAY = clamp(Number(argValue('--per-day') ?? '4'), 1, 8);
const PSEO_ONLY = argFlag('--pseo-only');
const PRODUCTS_ONLY = argFlag('--products-only');
const MERGE = argFlag('--merge');
const START = argValue('--start');

// ─── Shopify Admin client (token mint + GraphQL) ────────────────────────────

let TOKEN = '';
async function mintToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
  }
  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`Token mint ${res.status}: ${await res.text()}`);
  return (await res.json() as { access_token: string }).access_token;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  if (!json.data) throw new Error('empty data');
  return json.data;
}

// ─── Shopify product fetcher ────────────────────────────────────────────────

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  featuredImage: { url: string; altText: string | null } | null;
  images: Array<{ url: string; altText: string | null }>;
  priceRange: { min: { amount: string; currencyCode: string } };
}

// Named type so TS doesn't have to infer the `data` binding from a
// self-referencing generic call (TS7022).
interface ProductsQueryResult {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      description: string;
      productType: string;
      vendor: string;
      tags: string[];
      status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
      featuredImage: { url: string; altText: string | null } | null;
      images: { nodes: Array<{ url: string; altText: string | null }> };
      priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } };
    }>;
  };
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const data: ProductsQueryResult = await gql<ProductsQueryResult>(
      `query Products($cursor: String) {
        products(first: 100, after: $cursor, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id handle title description productType vendor tags status
            featuredImage { url altText }
            images(first: 4) { nodes { url altText } }
            priceRangeV2 { minVariantPrice { amount currencyCode } }
          }
        }
      }`,
      { cursor },
    );
    for (const n of data.products.nodes) {
      all.push({
        id: n.id,
        handle: n.handle,
        title: n.title,
        description: n.description,
        productType: n.productType,
        vendor: n.vendor,
        tags: n.tags,
        status: n.status,
        featuredImage: n.featuredImage,
        images: n.images.nodes,
        priceRange: { min: n.priceRangeV2.minVariantPrice },
      });
    }
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    pages += 1;
  } while (cursor && pages < 50 && all.length < LIMIT);
  return all.slice(0, LIMIT);
}

// ─── Voice sanitizer + caption builders ─────────────────────────────────────
//
// We never call an LLM in this script. The captions are template-driven from
// product/page metadata so the output is deterministic, free, and instantly
// reviewable. If we want LLM-polished captions later, that's a follow-up
// pass on the JSON, not a blocker for shipping.

const HYPE_WORDS = /\b(amazing|stunning|incredible|unbelievable|wow|best ever|must.have|game.changer)\b/gi;

function moonRavenize(s: string): string {
  return s
    .replace(/!+/g, '.') // no exclamation marks
    .replace(HYPE_WORDS, '') // strip hype
    .replace(/\s{2,}/g, ' ') // collapse double spaces left by the substitutions above
    .replace(/\s+([.,;:])/g, '$1') // tighten punctuation
    .trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  // Find the last sentence boundary or space before the limit.
  const slice = s.slice(0, max - 1);
  const lastDot = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('. '));
  if (lastDot > max * 0.5) return slice.slice(0, lastDot + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : max - 1) + '…';
}

// Soft CTAs — rotate so the backlog doesn't look like one repeating template.
const SOFT_CTAS = [
  'Find it at moonraven.com.',
  'Quiet pieces, made to last.',
  'Hand-cast in Brentwood Bay, BC.',
  'Slow-made, made-to-order.',
  'See the rest of the collection at moonraven.com.',
  'Made in small batches.',
] as const;

function pickCta(seed: number): string {
  return SOFT_CTAS[seed % SOFT_CTAS.length] as string;
}

// ─── Board + hashtag selection ──────────────────────────────────────────────

function lower(s: string): string {
  return s.toLowerCase();
}

function tokens(p: { title: string; tags: string[]; productType: string }): Set<string> {
  return new Set([lower(p.title), ...p.tags.map(lower), lower(p.productType)].flatMap((t) => t.split(/\s+/)));
}

function pickBoardForProduct(p: ShopifyProduct): BoardName {
  const tt = tokens(p);
  const has = (k: string): boolean => Array.from(tt).some((t) => t.includes(k));

  // Highest-priority signal: memorial/cremation — always Memorial board.
  if (
    has('memorial') ||
    has('cremation') ||
    has('urn') ||
    has('ash') ||
    has('ashes') ||
    has('keepsake')
  ) {
    return BOARDS.MEMORIAL;
  }
  // Next: wildlife symbols (raven, wolf, antler, etc.) → Wildlife.
  if (['raven', 'wolf', 'crow', 'corvid', 'antler', 'feather', 'horse', 'snake', 'serpent'].some(has)) {
    return BOARDS.WILDLIFE;
  }
  // Symbolism — skull, moon, sun, eye, ouroboros, etc.
  if (['skull', 'moon', 'sun', 'eye', 'ouroboros', 'pentacle', 'rune', 'talisman'].some(has)) {
    return BOARDS.SYMBOLISM;
  }
  // Material fallback — silver vs bronze.
  if (has('silver')) return BOARDS.SILVER;
  if (has('bronze') || has('brass') || has('copper')) return BOARDS.BRONZE;
  // Default catch-all.
  return BOARDS.TALISMANIC;
}

function pickBoardForPseo(kind: 'symbolism' | 'memorial' | 'material', slug: string): BoardName {
  if (kind === 'memorial') return BOARDS.MEMORIAL;
  if (kind === 'material') {
    return slug.includes('silver') ? BOARDS.SILVER : BOARDS.BRONZE;
  }
  // symbolism — choose Wildlife vs Symbolism by slug heuristic.
  const wildlife = ['raven', 'wolf', 'antler', 'feather', 'horse', 'snake', 'crow'];
  return wildlife.some((w) => slug.includes(w)) ? BOARDS.WILDLIFE : BOARDS.SYMBOLISM;
}

// Hashtag pool — small, deliberate. We pick 4-6 per pin by intersecting
// product tags with this pool, then padding with board-context hashtags.
const HASHTAG_POOL: Record<string, string[]> = {
  memorial: ['MemorialJewelry', 'CremationJewelry', 'AshKeepsake', 'GriefJourney', 'InMemory'],
  raven: ['RavenJewelry', 'CorvidLove', 'Witchcore', 'DarkAcademia', 'GothicJewelry'],
  wolf: ['WolfJewelry', 'WildlifeJewelry', 'TotemJewelry', 'PNWMade'],
  antler: ['AntlerJewelry', 'NatureJewelry', 'BoneJewelry', 'EarthyStyle'],
  feather: ['FeatherJewelry', 'BohoJewelry', 'NatureLovers'],
  horse: ['EquestrianStyle', 'HorseJewelry', 'HorseLover'],
  snake: ['SerpentJewelry', 'SnakeRing', 'OuroborosMeaning'],
  skull: ['SkullJewelry', 'MementoMori', 'GothicJewelry'],
  silver: ['SterlingSilver', 'HandmadeJewelry', 'SlowFashion'],
  bronze: ['BronzeJewelry', 'HandmadeJewelry', 'SlowFashion'],
  generic: ['MoonRavenDesigns', 'HandcraftedJewelry', 'TalismanJewelry', 'MeaningfulJewelry'],
};

function pickHashtags(p: { title: string; tags: string[]; productType: string }, board: BoardName): string[] {
  const tt = tokens(p);
  const has = (k: string): boolean => Array.from(tt).some((t) => t.includes(k));
  const picks = new Set<string>();

  // Topical pool first.
  for (const [key, tags] of Object.entries(HASHTAG_POOL)) {
    if (key === 'generic') continue;
    if (has(key)) for (const t of tags) picks.add(t);
    if (picks.size >= 4) break;
  }
  // Board-context pool (silver/bronze for material boards).
  if (board === BOARDS.SILVER) for (const t of HASHTAG_POOL.silver) picks.add(t);
  if (board === BOARDS.BRONZE) for (const t of HASHTAG_POOL.bronze) picks.add(t);
  if (board === BOARDS.MEMORIAL) for (const t of HASHTAG_POOL.memorial) picks.add(t);

  // Always include a brand anchor.
  picks.add('MoonRavenDesigns');

  // Pad with generic pool to reach 4-6.
  for (const t of HASHTAG_POOL.generic as string[]) {
    if (picks.size >= 5) break;
    picks.add(t);
  }
  return Array.from(picks).slice(0, 6);
}

// ─── Caption builders ───────────────────────────────────────────────────────

function captionForProduct(p: ShopifyProduct, cta: string): { title: string; description: string } {
  // Title: keep the product name primary, optional sub-clause if we have room.
  const baseTitle = p.title.split(/\s[-–—|]\s/)[0]?.trim() ?? p.title;
  const title = truncate(moonRavenize(baseTitle), 100);

  // Description: first 1-2 sentences from product description, then CTA.
  const descRaw = moonRavenize(stripHtml(p.description));
  // Pinterest's algo penalizes thin descriptions; aim for ~300 chars + CTA.
  const body = truncate(descRaw, 380);
  const description = truncate(`${body} ${cta}`.trim(), 500);
  return { title, description };
}

function captionForSymbolism(s: (typeof SYMBOLS)[number], cta: string): { title: string; description: string } {
  const title = truncate(moonRavenize(`${s.label} symbolism in jewelry`), 100);
  const body = moonRavenize(`${s.hook} A short read on what the ${s.label.toLowerCase()} has meant across cultures, and how the symbol carries into a wearable piece.`);
  return { title, description: truncate(`${body} ${cta}`, 500) };
}

function captionForMemorial(m: (typeof MEMORIALS)[number], cta: string): { title: string; description: string } {
  const title = truncate(moonRavenize(`Memorial jewelry for the ${m.label.toLowerCase()}`), 100);
  const body = moonRavenize(`${m.hook} A guide to choosing a piece that holds the ${m.griefSubject} close — quietly, every day.`);
  return { title, description: truncate(`${body} ${cta}`, 500) };
}

function captionForMaterial(mat: (typeof MATERIALS)[number], cta: string): { title: string; description: string } {
  const title = truncate(moonRavenize(`${mat.label} jewelry, handcrafted`), 100);
  const body = moonRavenize(`${mat.hook} How ${mat.label.toLowerCase()} wears, why we use it, and pieces cast in it.`);
  return { title, description: truncate(`${body} ${cta}`, 500) };
}

// ─── Scheduling ─────────────────────────────────────────────────────────────
//
// We space pins PER_DAY/day, starting tomorrow at 10:00 local (configurable
// via --start), one pin every (24/PER_DAY) hours. Pinterest's own algo prefers
// 1-5 pins/day spaced out — we pick 4 by default to stay in the safe zone.

function buildSchedule(count: number): string[] {
  const start = START ? new Date(START) : nextMorning();
  const intervalMs = Math.floor((24 * 60 * 60 * 1000) / PER_DAY);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(start.getTime() + i * intervalMs);
    out.push(t.toISOString());
  }
  return out;
}

function nextMorning(): Date {
  // Tomorrow at 10:00 in the runner's local timezone.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

// ─── Entry builders ─────────────────────────────────────────────────────────

function productEntry(p: ShopifyProduct, scheduledFor: string): BacklogEntry | null {
  if (!p.featuredImage) return null; // Pinterest needs an image.
  const board = pickBoardForProduct(p);
  const cta = pickCta(hashCode(p.handle));
  const { title, description } = captionForProduct(p, cta);
  return {
    id: `product:${p.handle}`,
    boardName: board,
    title,
    description,
    link: `${PUBLIC_SITE_URL}/products/${p.handle}`,
    imageUrl: p.featuredImage.url,
    altText: truncate(p.featuredImage.altText ?? title, 500),
    hashtags: pickHashtags(p, board),
    scheduledFor,
    source: { kind: 'product', handle: p.handle },
    status: 'pending',
  };
}

function symbolismEntry(s: (typeof SYMBOLS)[number], scheduledFor: string, image: string | null): BacklogEntry | null {
  if (!image) return null;
  const board = pickBoardForPseo('symbolism', s.slug);
  const cta = pickCta(hashCode(s.slug));
  const { title, description } = captionForSymbolism(s, cta);
  return {
    id: `pseo-symbolism:${s.slug}`,
    boardName: board,
    title,
    description,
    link: `${PUBLIC_SITE_URL}/pages/${s.slug}-symbolism`,
    imageUrl: image,
    altText: truncate(s.title, 500),
    hashtags: [
      ...(HASHTAG_POOL[s.slug] ?? []),
      ...(HASHTAG_POOL.generic as string[]),
    ].slice(0, 5),
    scheduledFor,
    source: { kind: 'pseo', pageType: 'symbolism', slug: s.slug },
    status: 'pending',
  };
}

function memorialEntry(m: (typeof MEMORIALS)[number], scheduledFor: string, image: string | null): BacklogEntry | null {
  if (!image) return null;
  const board = pickBoardForPseo('memorial', m.slug);
  const cta = pickCta(hashCode(m.slug));
  const { title, description } = captionForMemorial(m, cta);
  return {
    id: `pseo-memorial:${m.slug}`,
    boardName: board,
    title,
    description,
    link: `${PUBLIC_SITE_URL}/pages/memorial-${m.slug}`,
    imageUrl: image,
    altText: truncate(`Memorial jewelry — ${m.label}`, 500),
    hashtags: [...HASHTAG_POOL.memorial, ...(HASHTAG_POOL.generic as string[])].slice(0, 5),
    scheduledFor,
    source: { kind: 'pseo', pageType: 'memorial', slug: m.slug },
    status: 'pending',
  };
}

function materialEntry(mat: (typeof MATERIALS)[number], scheduledFor: string, image: string | null): BacklogEntry | null {
  if (!image) return null;
  const board = pickBoardForPseo('material', mat.slug);
  const cta = pickCta(hashCode(mat.slug));
  const { title, description } = captionForMaterial(mat, cta);
  const poolKey = mat.slug.includes('silver') ? 'silver' : 'bronze';
  return {
    id: `pseo-material:${mat.slug}`,
    boardName: board,
    title,
    description,
    link: `${PUBLIC_SITE_URL}/pages/${mat.slug}-jewelry`,
    imageUrl: image,
    altText: truncate(`${mat.label} jewelry`, 500),
    hashtags: [...(HASHTAG_POOL[poolKey] ?? []), ...(HASHTAG_POOL.generic as string[])].slice(0, 5),
    scheduledFor,
    source: { kind: 'pseo', pageType: 'material', slug: mat.slug },
    status: 'pending',
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Pick a fallback image for a pSEO page from the first matching product's
// featured image. pSEO pages don't have their own hero image stored anywhere
// we can fetch programmatically, so we re-use the most-recently-updated
// product that matches the page's matchTerms.
function findFallbackImage(
  products: ShopifyProduct[],
  matchTerms: string[],
): string | null {
  const lowerTerms = matchTerms.map(lower);
  const match = products.find((p) => {
    const text = `${lower(p.title)} ${p.tags.map(lower).join(' ')}`;
    return lowerTerms.some((t) => text.includes(t));
  });
  return match?.featuredImage?.url ?? null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Pinterest backlog builder — Moon Raven Designs');
  console.log(`  per-day: ${PER_DAY}`);
  console.log(`  limit: ${LIMIT === Infinity ? 'unlimited' : LIMIT}`);
  console.log(`  start: ${START ?? 'tomorrow 10:00 local'}`);
  console.log(`  merge: ${MERGE}`);
  console.log('');

  TOKEN = await mintToken();
  console.log(`Shopify token minted (${TOKEN.slice(0, 8)}...)`);

  let products: ShopifyProduct[] = [];
  if (!PSEO_ONLY) {
    products = await fetchAllProducts();
    console.log(`Fetched ${products.length} active products`);
  }

  // Build raw entry list (un-scheduled). We schedule once we know the total.
  type RawEntry = Omit<BacklogEntry, 'scheduledFor'>;
  const rawEntries: RawEntry[] = [];

  if (!PSEO_ONLY) {
    for (const p of products) {
      const e = productEntry(p, '');
      if (e) rawEntries.push(e);
    }
  }

  if (!PRODUCTS_ONLY) {
    // pSEO pages need a fallback image — re-use products[0] of each topic.
    // If we ran with --pseo-only we still need product data for fallback
    // images; fetch a lightweight batch.
    if (PSEO_ONLY && products.length === 0) {
      products = await fetchAllProducts();
      console.log(`Fetched ${products.length} products (for pSEO fallback images)`);
    }
    for (const s of SYMBOLS) {
      const img = findFallbackImage(products, s.matchTerms);
      const e = symbolismEntry(s, '', img);
      if (e) rawEntries.push(e);
    }
    for (const m of MEMORIALS) {
      const img = findFallbackImage(products, m.productKeywords);
      const e = memorialEntry(m, '', img);
      if (e) rawEntries.push(e);
    }
    for (const mat of MATERIALS) {
      const img = findFallbackImage(products, mat.matchTerms);
      const e = materialEntry(mat, '', img);
      if (e) rawEntries.push(e);
    }
  }

  // Shuffle deterministically so adjacent pins on the same board don't run
  // back-to-back in the same hour. We use a hash-sort by id.
  rawEntries.sort((a, b) => hashCode(a.id) - hashCode(b.id));

  const times = buildSchedule(rawEntries.length);
  const entries: BacklogEntry[] = rawEntries.map((e, i) => ({
    ...e,
    scheduledFor: times[i] ?? new Date().toISOString(),
  }));

  // Merge or overwrite.
  let backlog: Backlog;
  if (MERGE) {
    backlog = readBacklog();
    const existingIds = new Set(backlog.entries.map((e) => e.id));
    const added = entries.filter((e) => !existingIds.has(e.id));
    backlog.entries.push(...added);
    backlog.generatedAt = new Date().toISOString();
    console.log(`Merged: ${added.length} new entries, ${entries.length - added.length} skipped (already present)`);
  } else {
    backlog = { generatedAt: new Date().toISOString(), entries };
    console.log(`Built fresh backlog: ${entries.length} entries`);
  }

  writeBacklog(backlog);
  console.log(`Wrote ${BACKLOG_PATH}`);

  // Summary table.
  const byBoard: Record<string, number> = {};
  for (const e of backlog.entries) byBoard[e.boardName] = (byBoard[e.boardName] ?? 0) + 1;
  console.log('');
  console.log('Per board:');
  for (const [b, n] of Object.entries(byBoard)) console.log(`  ${b}: ${n}`);
  console.log('');
  console.log(`First scheduled: ${backlog.entries[0]?.scheduledFor ?? '(none)'}`);
  console.log(`Last  scheduled: ${backlog.entries.at(-1)?.scheduledFor ?? '(none)'}`);
  console.log('');
  console.log('Review the file, then run:');
  console.log('  npx tsx scripts/pinterest-schedule.ts --dry-run');
}

// Suppress unused-var warnings for the inferred fs/path imports — we only
// reference them indirectly via the client module's BACKLOG_PATH. Keep them
// imported so a future debug-dump can land without a re-import.
void fs;
void path;

main().catch((err: unknown) => {
  console.error('Backlog build failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
