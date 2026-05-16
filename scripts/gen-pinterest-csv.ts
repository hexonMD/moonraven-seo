#!/usr/bin/env tsx
/**
 * Generate the 100-pin bulk-upload CSV for Pinterest (moonraven-100-pins.csv).
 *
 * Composition:
 *   • 60 pins from Shopify products (recently updated, status:active)
 *   • 40 pins from existing Moon Raven pSEO pages (symbolism + memorial + materials)
 *     — Tier 2 dirs (gift-guides/intersections/occasions) check if any *.json
 *       files exist in src/content/{gift-guides,intersections,occasions}; if so,
 *       we'd carve 15 from those and reduce the pSEO count. As of generation,
 *       those dirs don't exist yet, so pSEO gets the full 40.
 *
 * Pin caption rules (Pinterest spec):
 *   • Title ≤ 100 chars, search-friendly, no clickbait.
 *   • Description ≤ 500 chars, ends with a soft CTA.
 *   • 4-6 relevant hashtags appended to description.
 *   • Board chosen from the six fixed boards Mike will pre-create.
 *
 * Output: scripts/moonraven-100-pins.csv (columns:
 *   Title, Description, Media URL, Link, Pinterest Board, Hashtags)
 *
 * No LLM calls — captions are templated. Determinism > flair on a 100-pin
 * batch; humans skim 50+ Pinterest captions on a topic and notice they all
 * follow the same shape anyway. The brief said DeepSeek is fine if needed,
 * but with 42 pSEO pages already authored as rich content, the source text
 * is varied enough — we extract the strongest sentence from each.
 *
 * Run: SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/gen-pinterest-csv.ts
 */

import fs from 'node:fs';
import path from 'node:path';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

let TOKEN = '';

async function mintToken(): Promise<string> {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  // Clip on word boundary, drop trailing punctuation.
  const cut = s.slice(0, n - 1).replace(/[\s,;:.!?-]+$/, '');
  const lastSp = cut.lastIndexOf(' ');
  return (lastSp > n * 0.6 ? cut.slice(0, lastSp) : cut) + '…';
}

function stripHtml(s: string): string {
  return s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;|&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ─── Tag → hashtag selection ────────────────────────────────────────────────

const HASHTAG_LIBRARY = {
  // Symbolism / motif
  raven: ['#ravenjewelry', '#ravennecklace', '#odinsravens', '#ravenpendant'],
  skull: ['#skulljewelry', '#momentomori', '#skullnecklace', '#gothicjewelry'],
  wolf: ['#wolfjewelry', '#wolfnecklace', '#wolfpendant', '#wildlifejewelry'],
  bear: ['#bearjewelry', '#bearclaw', '#wildlifejewelry', '#talismannecklace'],
  snake: ['#snakejewelry', '#serpentnecklace', '#snakependant', '#ouroboros'],
  feather: ['#featherjewelry', '#feathernecklace', '#featherpendant', '#talisman'],
  antler: ['#antlerjewelry', '#deerantler', '#antlernecklace', '#naturejewelry'],
  bone: ['#bonejewelry', '#bonenecklace', '#momentomori'],
  moon: ['#moonjewelry', '#moonnecklace', '#celestialjewelry', '#crescentmoon'],
  eye: ['#eyejewelry', '#evileye', '#protectionnecklace', '#talisman'],
  horse: ['#horsejewelry', '#equestrianjewelry', '#horsenecklace'],
  celtic: ['#celticjewelry', '#celticknot', '#celticnecklace', '#norsejewelry'],
  runes: ['#runejewelry', '#norseruns', '#norsejewelry', '#vikingjewelry'],

  // Memorial
  memorial: ['#memorialjewelry', '#cremationjewelry', '#keepsakejewelry', '#griefsupport'],
  pet: ['#petmemorial', '#petkeepsake', '#petlossjewelry'],

  // Materials
  silver: ['#sterlingsilverjewelry', '#925silver', '#handcraftedsilver'],
  bronze: ['#bronzejewelry', '#handcraftedbronze', '#solidbronze'],
  copper: ['#copperjewelry', '#handcraftedcopper'],

  // Categories
  necklace: ['#necklace', '#pendantnecklace', '#statementnecklace'],
  ring: ['#ring', '#statementring', '#handcraftedring'],
  earring: ['#earrings', '#statementearrings'],
  bracelet: ['#bracelet', '#handcraftedbracelet'],
  charm: ['#charmnecklace', '#charmjewelry'],

  // Brand evergreens
  brand: ['#handcraftedjewelry', '#artisanjewelry', '#darkjewelry', '#symbolicjewelry'],
};

function pickHashtags(text: string, baseCount = 5): string[] {
  // Strip the brand name "Moon Raven" before motif-matching so the words
  // "raven" and "moon" don't fire on every copper/bronze/silver page.
  const lc = text.toLowerCase().replace(/moon raven designs?/g, '').replace(/moonraven/g, '');
  const picks = new Set<string>();
  const add = (arr: string[]) => arr.forEach((h) => picks.add(h));

  // Match motifs — use word boundary so "necklace" doesn't match inside other words
  for (const [key, tags] of Object.entries(HASHTAG_LIBRARY)) {
    if (key === 'brand') continue;
    const re = new RegExp(`\\b${key}`, 'i');
    if (re.test(lc)) add(tags.slice(0, 2));
  }
  // Always sprinkle two brand evergreens
  add(HASHTAG_LIBRARY.brand.slice(0, 2));

  // Trim to base count (4-6 range)
  const arr = Array.from(picks);
  while (arr.length > Math.min(6, baseCount)) arr.pop();
  while (arr.length < 4) arr.push(HASHTAG_LIBRARY.brand[arr.length] || '#jewelry');
  return arr;
}

// ─── Board routing ──────────────────────────────────────────────────────────

function pickBoard(text: string, productType?: string): string {
  // Strip brand name so "Moon Raven Designs" in body text doesn't auto-route
  // every page to Wildlife.
  const lc = text.toLowerCase().replace(/moon raven designs?/g, '').replace(/moonraven/g, '');
  if (/memorial|cremation|keepsake|loss|grief|pregnancy/.test(lc)) return 'Memorial Keepsakes';
  if (/\b(wolf|bear|claw|antler|horse|raven|snake|feather|deer|talon|wildlife)\b/.test(lc)) return 'Wildlife Jewelry';
  if (/\b(symbol|meaning|talisman|celtic|norse|rune|odin|viking|spirit|ouroboros)\b/.test(lc)) return 'Symbolism & Meaning';
  if (/\b(sterling|silver)\b/.test(lc)) return 'Handcrafted Silver';
  if (/\b(bronze|copper)\b/.test(lc)) return 'Handcrafted Bronze';
  return 'Talismanic Jewelry';
}

// ─── Title polishing ────────────────────────────────────────────────────────
//
// Product titles from Shopify are often "X – Long Descriptive Phrase by …".
// For Pinterest, lead with the noun, append a single emotive descriptor.

function polishProductTitle(raw: string): string {
  // Drop trailing " - Moon Raven Designs", " by Moon Raven Designs"
  let t = raw
    .replace(/\s+[-–]\s+(by\s+)?Moon Raven Designs.*$/i, '')
    .replace(/\s+by Moon Raven Designs.*$/i, '')
    .replace(/\s+\|\s+Moon Raven Designs.*$/i, '')
    .trim();

  // If title is already short enough and looks well-formed, return as-is.
  if (t.length <= 95) return t;
  return clip(t, 95);
}

function polishProductDescription(title: string, descHtml: string, price: string, currency: string): string {
  const desc = stripHtml(descHtml);
  // Lead with the first 1-2 sentences of the actual description, fall back to title.
  const sentences = desc.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
  let lead = sentences.slice(0, 2).join(' ');
  if (!lead) lead = title;

  const cta = `Handcrafted since 1974. Shop the collection.`;
  // Budget: 500 chars total, minus CTA + 1 leading space = ~440 for body.
  const bodyBudget = 500 - (cta.length + 2);
  const body = clip(lead, bodyBudget);
  return `${body} ${cta}`.trim();
}

// ─── Build product pins ─────────────────────────────────────────────────────

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  descriptionHtml: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } };
}

async function fetchProducts(limit: number): Promise<ProductNode[]> {
  const Q = `query($n:Int!,$after:String){
    products(first:$n, after:$after, sortKey:UPDATED_AT, reverse:true, query:"status:active") {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title productType vendor tags descriptionHtml
        featuredImage { url altText }
        priceRangeV2 { minVariantPrice { amount currencyCode } }
      }
    }
  }`;
  const out: ProductNode[] = [];
  let cursor: string | null = null;
  while (out.length < limit) {
    const d = await gql<{ products: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ProductNode[] } }>(
      Q,
      { n: Math.min(40, limit - out.length + 10), after: cursor },
    );
    // Skip products without a featured image (we can't pin them).
    for (const p of d.products.nodes) {
      if (p.featuredImage?.url) out.push(p);
      if (out.length >= limit) break;
    }
    if (!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
  }
  return out.slice(0, limit);
}

function productToPin(p: ProductNode): PinRow {
  const title = polishProductTitle(p.title);
  const price = p.priceRangeV2.minVariantPrice.amount;
  const ccy = p.priceRangeV2.minVariantPrice.currencyCode;
  const desc = polishProductDescription(title, p.descriptionHtml, price, ccy);
  // Hashtag picker MUST use title+productType only, not the bulky tags array
  // — Shopify's tags array on a product often spans 100+ generic terms
  // ("raven", "skull", "wolf") regardless of what the product actually is,
  // which pollutes the motif match. Use the title text to decide motif.
  const matchText = `${title} ${p.productType} ${stripHtml(p.descriptionHtml).slice(0, 300)}`;
  // Board picker can use tags more broadly since boards are coarser.
  const boardText = `${title} ${p.productType} ${p.tags.slice(0, 10).join(' ')}`;
  return {
    title,
    description: desc,
    mediaUrl: p.featuredImage!.url,
    link: `${SITE_URL}/products/${p.handle}?utm_source=pinterest&utm_medium=organic&utm_campaign=launch`,
    board: pickBoard(boardText, p.productType),
    hashtags: pickHashtags(matchText).join(' '),
  };
}

// ─── Build pSEO pins from local content/*.json ──────────────────────────────

interface PseoSource {
  contentPath: string;
  shopifyHandle: string;
  category: 'symbolism' | 'memorial' | 'materials' | 'gift-guides' | 'intersections' | 'occasions';
}

function listPseo(): PseoSource[] {
  const root = path.join('src', 'content');
  const buckets: Array<{ dir: string; cat: PseoSource['category']; handlePrefix: string }> = [
    { dir: 'symbolism', cat: 'symbolism', handlePrefix: '' /* slug + "-symbolism" */ },
    { dir: 'memorial', cat: 'memorial', handlePrefix: 'memorial-' },
    { dir: 'materials', cat: 'materials', handlePrefix: '' /* slug + "-jewelry" */ },
    // For Tier 2 (gift-guides / intersections / occasions), the JSON filename
    // IS the page handle as imported by scripts/import-tier2-to-shopify.ts
    // (e.g. gift-mom-raven.json → /pages/gift-mom-raven).
    { dir: 'gift-guides', cat: 'gift-guides', handlePrefix: '' },
    { dir: 'intersections', cat: 'intersections', handlePrefix: '' },
    { dir: 'occasions', cat: 'occasions', handlePrefix: '' },
  ];
  const out: PseoSource[] = [];
  for (const b of buckets) {
    const full = path.join(root, b.dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith('.json') || f.endsWith('.brief.json')) continue;
      const slug = f.replace(/\.json$/, '');
      let handle: string;
      if (b.cat === 'symbolism') handle = `${slug}-symbolism`;
      else if (b.cat === 'memorial') handle = `memorial-${slug}`;
      else if (b.cat === 'materials') handle = `${slug}-jewelry`;
      else handle = slug; // Tier 2: slug == handle
      out.push({
        contentPath: path.join(full, f),
        shopifyHandle: handle,
        category: b.cat,
      });
    }
  }
  return out;
}

// Pick a topically relevant product image for a pSEO page by matching the
// pSEO slug against product titles. Much better than a single shared brand
// fallback image — Pinterest weights image variety heavily.
//
// Counter is keyed by category so memorial pages cycle through the
// urn/heart/locket pool instead of all 20 hitting the same first match.
const pseoFallbackCursor: Record<string, number> = {};
function imageForPseo(src: PseoSource, products: ProductNode[]): string | null {
  const slug = path.basename(src.contentPath, '.json');
  const norm = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ');

  // 1) Try a slug-specific match first.
  const slugMatches = products.filter((p) => p.featuredImage && norm(p.title).includes(norm(slug)));
  if (slugMatches.length) return slugMatches[0].featuredImage!.url;

  // For Tier 2, the slug embeds a motif keyword (e.g. "gift-mom-RAVEN",
  // "sterling-silver-SKULL-jewelry", "INFANT-LOSS-keepsake") — search the
  // slug parts for matches against product titles.
  if (['gift-guides', 'intersections', 'occasions'].includes(src.category)) {
    const parts = slug.split('-').filter((p) => p.length >= 4 && !['gift','jewelry','keepsake','silver','sterling','bronze','memorial','remembrance','loss'].includes(p));
    for (const part of parts) {
      const hit = products.find((p) => p.featuredImage && norm(p.title).includes(part));
      if (hit) return hit.featuredImage!.url;
    }
    // Memorial-flavored Tier 2 → use the memorial pool
    if (/loss|memorial|grief|bereavement|remembrance|miscarriage|infant|baby-loss|rainbow|bridge|pregnancy/.test(slug)) {
      const pool = products.filter((p) => p.featuredImage && /urn|heart|memorial|keepsake|locket|cremation/i.test(p.title));
      if (pool.length) {
        const i = (pseoFallbackCursor['memorial'] = (pseoFallbackCursor['memorial'] ?? -1) + 1) % pool.length;
        return pool[i].featuredImage!.url;
      }
    }
  }

  // 2) Category-level fallback pool — cycle across all matching products.
  let pool: ProductNode[] = [];
  if (src.category === 'memorial') {
    pool = products.filter((p) => p.featuredImage && /urn|heart|memorial|keepsake|locket|cremation/i.test(p.title));
  } else if (src.category === 'symbolism') {
    pool = products.filter((p) => p.featuredImage && /pendant|talisman|amulet/i.test(p.title));
  } else if (src.category === 'materials') {
    const m = slug.includes('bronze') ? /bronze/i : slug.includes('copper') ? /copper/i : /silver|sterling/i;
    pool = products.filter((p) => p.featuredImage && m.test(p.title));
  }
  if (pool.length) {
    const i = (pseoFallbackCursor[src.category] = (pseoFallbackCursor[src.category] ?? -1) + 1) % pool.length;
    return pool[i].featuredImage!.url;
  }
  return null;
}

function pseoToPin(src: PseoSource, fallbackImage: string, products: ProductNode[]): PinRow | null {
  const raw = JSON.parse(fs.readFileSync(src.contentPath, 'utf-8'));
  const seoTitle: string = raw.seo_title ?? raw.title ?? src.shopifyHandle;
  const intro: string = raw.intro ?? raw.meta_description ?? '';

  // Pinterest title: drop the "| Moon Raven Designs" trailer.
  let title = seoTitle.replace(/\s*\|\s*Moon Raven Designs.*$/i, '').trim();
  title = clip(title, 95);

  const cta = src.category === 'memorial'
    ? 'A small weight for a private grief. Explore handcrafted memorial pieces.'
    : src.category === 'materials'
      ? 'Made on Vancouver Island since 1974. See the collection.'
      : 'Read the full meaning and shop the symbol.';

  const bodyBudget = 500 - (cta.length + 2);
  const body = clip(intro || title, bodyBudget);
  const description = `${body} ${cta}`.trim();

  // Prefer a topical product image, fall back to the shared brand image.
  const image = imageForPseo(src, products) ?? fallbackImage;

  return {
    title,
    description,
    mediaUrl: image,
    link: `${SITE_URL}/pages/${src.shopifyHandle}?utm_source=pinterest&utm_medium=organic&utm_campaign=launch`,
    board: pickBoard(`${title} ${intro} ${src.category}`),
    hashtags: pickHashtags(`${title} ${intro} ${src.category}`).join(' '),
  };
}

// ─── Output row shape ───────────────────────────────────────────────────────

interface PinRow {
  title: string;
  description: string;
  mediaUrl: string;
  link: string;
  board: string;
  hashtags: string;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
    process.exit(1);
  }

  TOKEN = await mintToken();
  console.log(`Token minted (${TOKEN.slice(0, 12)}...)`);

  console.log('\nFetching products...');
  const products = await fetchProducts(60);
  console.log(`Got ${products.length} products`);

  console.log('\nReading pSEO content...');
  const pseo = listPseo();
  console.log(`Found ${pseo.length} pSEO pages on disk`);

  // Tier 2 buckets (gift-guides/intersections/occasions) take up to 15 if they exist.
  const tier2 = pseo.filter((p) => ['gift-guides', 'intersections', 'occasions'].includes(p.category));
  const tier1 = pseo.filter((p) => ['symbolism', 'memorial', 'materials'].includes(p.category));

  const wantTier2 = Math.min(15, tier2.length);
  const wantTier1 = Math.min(40 - wantTier2, tier1.length);

  console.log(`Pin allocation: ${products.length} product + ${wantTier1} tier-1 pSEO + ${wantTier2} tier-2 pSEO`);
  if (products.length + wantTier1 + wantTier2 < 100) {
    console.warn(`WARN: only ${products.length + wantTier1 + wantTier2} pins available (target 100)`);
  }

  // Use the first product's image as the fallback for pSEO pins — branded,
  // on-message, much better than a logo. Pinterest weights image quality
  // heavily, so the brand homepage logo would suppress reach.
  const fallbackImage = products[0]?.featuredImage?.url ??
    'https://cdn.shopify.com/s/files/1/0204/2526/files/moonraven-fallback.jpg';

  const rows: PinRow[] = [];
  for (const p of products) rows.push(productToPin(p));
  // Bias pSEO ordering: symbolism first (visual-strong topics), then memorial, then materials
  const symbolism = tier1.filter((p) => p.category === 'symbolism');
  const memorial = tier1.filter((p) => p.category === 'memorial');
  const materials = tier1.filter((p) => p.category === 'materials');
  const orderedT1 = [...symbolism, ...memorial, ...materials].slice(0, wantTier1);
  for (const p of orderedT1) {
    const pin = pseoToPin(p, fallbackImage, products);
    if (pin) rows.push(pin);
  }
  for (const p of tier2.slice(0, wantTier2)) {
    const pin = pseoToPin(p, fallbackImage, products);
    if (pin) rows.push(pin);
  }

  // Sanity check
  for (const r of rows) {
    if (r.title.length > 100) console.warn(`title overlong (${r.title.length}): ${r.title}`);
    if (r.description.length > 500) console.warn(`desc overlong (${r.description.length}): ${r.description.slice(0, 80)}...`);
  }

  // Write CSV
  const header = ['Title', 'Description', 'Media URL', 'Link', 'Pinterest Board', 'Hashtags'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.title, r.description, r.mediaUrl, r.link, r.board, r.hashtags].map(csvEscape).join(','));
  }
  const outPath = path.join('scripts', 'moonraven-100-pins.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`\nWrote ${rows.length} pins → ${outPath}`);

  // Print 5 samples for sanity
  console.log('\nFirst 3 product pins + 2 pSEO pins:');
  for (const r of [...rows.slice(0, 3), ...rows.slice(products.length, products.length + 2)]) {
    console.log('---');
    console.log(`Title (${r.title.length}): ${r.title}`);
    console.log(`Desc  (${r.description.length}): ${r.description}`);
    console.log(`Board: ${r.board}`);
    console.log(`Tags:  ${r.hashtags}`);
    console.log(`Link:  ${r.link}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
