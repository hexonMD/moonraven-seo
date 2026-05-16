#!/usr/bin/env tsx
/**
 * Import the 50 Tier 2 pSEO JSON files as native Shopify pages.
 *
 * Buckets: gift-guides, intersections, occasions.
 *
 * Page handle is the config-level `handle` (e.g. `gift-mom-raven`,
 * `bronze-raven-jewelry`, `miscarriage-remembrance-jewelry`).
 * templateSuffix='pseo' is set so they render via the existing
 * `templates/page.pseo.json` theme template installed by
 * scripts/shopify-theme-template.ts.
 *
 * Re-running: re-uses existing handles to update rather than duplicate.
 *
 * Usage:
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier2-to-shopify.ts
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier2-to-shopify.ts gift-guides
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier2-to-shopify.ts intersections
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier2-to-shopify.ts occasions
 */

import fs from 'node:fs';
import path from 'node:path';
import { GIFT_GUIDES, type GiftGuideConfig } from '../src/lib/gift-guides-config.js';
import { INTERSECTIONS, type IntersectionConfig } from '../src/lib/intersections-config.js';
import { OCCASIONS, type OccasionConfig } from '../src/lib/occasions-config.js';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
  process.exit(1);
}

// ─── Token + GraphQL ────────────────────────────────────────────────────────

let TOKEN = '';

async function mintToken(): Promise<string> {
  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Token mint ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
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

// ─── HTML helpers (kept in sync with import-to-shopify.ts) ──────────────────

const PSEO_STYLES = `
<style>
  .pseo-products { margin: 56px 0 32px; }
  .pseo-products h2 { font-size: 1.5rem; margin: 0 0 24px; letter-spacing: 0.02em; }
  .pseo-product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 20px 14px;
    margin: 0;
  }
  .pseo-product-card {
    display: block;
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
    transition: border-color 200ms, transform 200ms;
  }
  .pseo-product-card:hover { border-color: #e4ded4; transform: translateY(-2px); }
  .pseo-product-card__image {
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #f5f1eb;
    margin-bottom: 10px;
  }
  .pseo-product-card__image img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pseo-product-card__title {
    margin: 0 0 4px; font-size: 0.875rem; line-height: 1.35; text-align: center;
  }
  .pseo-product-card__price {
    margin: 0; font-size: 0.875rem; color: #6b6b6b; text-align: center;
  }
  .pseo-faq { margin-top: 56px; border-top: 1px solid #e4ded4; padding-top: 32px; }
  .pseo-faq h2 { font-size: 1.5rem; margin: 0 0 24px; }
  .pseo-faq-item { border-bottom: 1px solid #ece6dc; padding: 18px 0; }
  .pseo-faq-item h3 {
    font-size: 1rem; margin: 0 0 8px; letter-spacing: 0.04em;
    text-transform: uppercase; font-weight: 600;
  }
  .pseo-faq-item p { margin: 0; color: #4b4b4b; }
  .pseo-internal-links { margin: 48px 0 24px; padding: 24px; background: #faf7f1; border-radius: 4px; }
  .pseo-internal-links h2 { font-size: 1.1rem; margin: 0 0 12px; letter-spacing: 0.04em; text-transform: uppercase; }
  .pseo-internal-links ul { margin: 0; padding-left: 20px; }
  .pseo-internal-links li { margin: 6px 0; }
  .pseo-internal-links a { color: #4b4b4b; text-decoration: underline; }
  .rte blockquote {
    border-left: 2px solid #a89878;
    padding-left: 18px;
    margin: 28px 0;
    font-style: italic;
    color: #555;
  }
</style>
`.trim();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('\n');
}

/**
 * Strip a leading "header line" the LLM sometimes leaves in section bodies
 * (e.g. "Why this symbol for this person\n\nActual paragraph..."). The HTML
 * template emits its own <h2>, so the leading line is redundant.
 */
function stripLeadingHeader(text: string, headerPhrase: string): string {
  const trimmed = text.trimStart();
  const normHeader = headerPhrase.toLowerCase().replace(/\s+/g, ' ').trim();
  const firstNewline = trimmed.indexOf('\n');
  const firstLine = (firstNewline === -1 ? trimmed : trimmed.slice(0, firstNewline)).trim();
  const normFirst = firstLine.toLowerCase().replace(/\s+/g, ' ').trim();
  // Strip if exact match OR header is a substring of the first line
  // (handles "Why this symbol for this person" vs "Why this symbol for someone").
  if (
    normFirst === normHeader ||
    normFirst.startsWith(normHeader) ||
    (normFirst.length < 90 && normHeader.split(' ').slice(0, 3).join(' ') &&
      normFirst.startsWith(normHeader.split(' ').slice(0, 3).join(' ')) &&
      !/[.?!]$/.test(firstLine))
  ) {
    return firstNewline === -1 ? '' : trimmed.slice(firstNewline).trimStart();
  }
  return text;
}

function faqJsonLd(faq: Array<{ q: string; a: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function renderFaqSection(faq: Array<{ q: string; a: string }>): string {
  if (!faq?.length) return '';
  const items = faq
    .map(
      (qa) => `
    <div class="pseo-faq-item">
      <h3>${escapeHtml(qa.q)}</h3>
      <p>${escapeHtml(qa.a)}</p>
    </div>`,
    )
    .join('');
  return `<section class="pseo-faq"><h2>Frequently asked</h2>${items}</section>`;
}

type InternalLink = { label: string; href: string };

function renderInternalLinks(links: InternalLink[]): string {
  if (!links.length) return '';
  const items = links
    .map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`)
    .join('');
  return `<section class="pseo-internal-links"><h2>Related reading</h2><ul>${items}</ul></section>`;
}

// ─── Product grid ───────────────────────────────────────────────────────────

type ProductCardData = {
  handle: string;
  title: string;
  image: string | null;
  price: string | null;
};

async function searchProductsForKeywords(keywords: string[], first = 12): Promise<ProductCardData[]> {
  const clauses = keywords.flatMap((k) => [`tag:${k}`, `title:*${k}*`]);
  const q = `status:active AND (${clauses.join(' OR ')})`;
  const query = `
    query Search($q: String!, $first: Int!) {
      products(first: $first, query: $q, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          handle
          title
          featuredImage { url }
          priceRangeV2 { minVariantPrice { amount currencyCode } }
        }
      }
    }
  `;
  const data = await gql<{
    products: {
      nodes: Array<{
        handle: string;
        title: string;
        featuredImage: { url: string } | null;
        priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } };
      }>;
    };
  }>(query, { q, first: 80 });

  // Filter where the keyword actually appears in product title (not just brand
  // tags like "moon raven" matching on every product).
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const filtered = data.products.nodes.filter((p) => {
    const name = p.title.toLowerCase();
    return lowerKeywords.some((k) => name.includes(k));
  });
  return filtered.slice(0, first).map((p) => ({
    handle: p.handle,
    title: p.title.split(/\s[-–—|]\s/)[0],
    image: p.featuredImage?.url ?? null,
    price: p.priceRangeV2
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: p.priceRangeV2.minVariantPrice.currencyCode,
        }).format(Number(p.priceRangeV2.minVariantPrice.amount))
      : null,
  }));
}

function renderProductGrid(label: string, products: ProductCardData[]): string {
  if (!products.length) return '';
  const cards = products
    .map(
      (p) => `
    <a href="/products/${p.handle}" class="pseo-product-card">
      ${p.image ? `<div class="pseo-product-card__image"><img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy"/></div>` : ''}
      <p class="pseo-product-card__title">${escapeHtml(p.title)}</p>
      ${p.price ? `<p class="pseo-product-card__price">${p.price}</p>` : ''}
    </a>`,
    )
    .join('');
  return `<section class="pseo-products"><h2>${escapeHtml(label)}</h2><div class="pseo-product-grid">${cards}</div></section>`;
}

// ─── Internal-link selection ────────────────────────────────────────────────

/**
 * Pick 3-6 internal links per page from existing pSEO surfaces.
 * Heuristic: match the page's anchor / symbol / occasion against known
 * symbolism, memorial, materials, and other tier-2 slugs.
 */
function pickInternalLinksForGift(g: GiftGuideConfig): InternalLink[] {
  const links: InternalLink[] = [];
  const a = g.anchor.toLowerCase();

  // Tier 1 symbolism mappings
  const symbolMap: Record<string, [string, string]> = {
    raven: ['raven-symbolism', 'Raven symbolism in jewelry'],
    skull: ['skull-symbolism', 'Skull and memento mori symbolism'],
    wolf: ['wolf-symbolism', 'Wolf symbolism in jewelry'],
    snake: ['snake-symbolism', 'Snake and serpent symbolism'],
    feather: ['feather-symbolism', 'Feather symbolism in jewelry'],
    moon: ['moon-symbolism', 'Moon and lunar symbolism'],
    horse: ['horse-symbolism', 'Horse symbolism in jewelry'],
    antler: ['antler-symbolism', 'Antler symbolism in jewelry'],
  };
  if (symbolMap[a]) {
    links.push({ label: symbolMap[a][1], href: `/pages/${symbolMap[a][0]}` });
  }

  // Material link if anchor is bronze
  if (a === 'bronze') {
    links.push({ label: 'Solid bronze jewelry — properties and care', href: '/pages/solid-bronze-jewelry' });
  }

  // Memorial link if anchor is memorial
  if (a === 'memorial') {
    if (g.slug.includes('mom') || g.slug.includes('mother')) {
      links.push({ label: 'Memorial jewelry for the loss of a mother', href: '/pages/memorial-mother' });
    } else if (g.slug.includes('dad') || g.slug.includes('father')) {
      links.push({ label: 'Memorial jewelry for the loss of a father', href: '/pages/memorial-father' });
    } else if (g.slug.includes('grandfather')) {
      links.push({ label: 'Memorial jewelry for the loss of a grandfather', href: '/pages/memorial-grandfather' });
    } else if (g.slug.includes('pet')) {
      links.push({ label: 'Pet memorial jewelry', href: '/pages/memorial-pet' });
    }
  }

  // Tier-2 cross-links
  if (a === 'raven') {
    links.push({ label: 'Sterling silver raven jewelry', href: '/pages/sterling-silver-raven-jewelry' });
    links.push({ label: 'Bronze raven jewelry', href: '/pages/bronze-raven-jewelry' });
  }
  if (a === 'skull') {
    links.push({ label: 'Sterling silver skull and memento mori jewelry', href: '/pages/sterling-silver-skull-jewelry' });
  }
  if (a === 'wolf') {
    links.push({ label: 'Sterling silver wolf jewelry', href: '/pages/sterling-silver-wolf-jewelry' });
  }
  if (a === 'graduation') {
    links.push({ label: 'Graduation talisman jewelry', href: '/pages/graduation-talisman' });
  }
  if (a === 'anniversary') {
    links.push({ label: 'Anniversary jewelry symbolism by year', href: '/pages/anniversary-jewelry-symbolism' });
  }

  return links.slice(0, 6);
}

function pickInternalLinksForIntersection(i: IntersectionConfig): InternalLink[] {
  const links: InternalLink[] = [];

  const symbolMap: Record<string, [string, string]> = {
    raven: ['raven-symbolism', 'Raven symbolism in jewelry'],
    skull: ['skull-symbolism', 'Skull symbolism in jewelry'],
    wolf: ['wolf-symbolism', 'Wolf symbolism in jewelry'],
    snake: ['snake-symbolism', 'Snake symbolism in jewelry'],
    feather: ['feather-symbolism', 'Feather symbolism in jewelry'],
    antler: ['antler-symbolism', 'Antler symbolism in jewelry'],
    horse: ['horse-symbolism', 'Horse symbolism in jewelry'],
    bone: ['bone-symbolism', 'Bone symbolism in jewelry'],
  };
  if (symbolMap[i.symbol]) {
    links.push({ label: symbolMap[i.symbol][1], href: `/pages/${symbolMap[i.symbol][0]}` });
  }

  const materialMap: Record<string, [string, string]> = {
    'sterling silver': ['sterling-silver-jewelry', 'Sterling silver — properties and care'],
    bronze: ['solid-bronze-jewelry', 'Solid bronze — properties and care'],
    'oxidized bronze': ['oxidized-bronze-jewelry', 'Oxidized bronze — properties and care'],
  };
  if (materialMap[i.material]) {
    links.push({ label: materialMap[i.material][1], href: `/pages/${materialMap[i.material][0]}` });
  }

  // Cross-intersection link to the other material × same symbol if it exists
  for (const other of INTERSECTIONS) {
    if (other.slug === i.slug) continue;
    if (other.symbol === i.symbol) {
      links.push({ label: other.label, href: `/pages/${other.handle}` });
    }
    if (links.length >= 5) break;
  }

  return links.slice(0, 6);
}

function pickInternalLinksForOccasion(o: OccasionConfig): InternalLink[] {
  const links: InternalLink[] = [];

  // Map grief slugs to existing memorial pages
  if (o.slug === 'miscarriage-remembrance-jewelry' || o.slug === 'infant-loss-keepsake' || o.slug === 'baby-loss-father-keepsake') {
    links.push({ label: 'Memorial jewelry for pregnancy loss', href: '/pages/memorial-pregnancy-loss' });
    links.push({ label: 'Memorial jewelry for the loss of a baby', href: '/pages/memorial-baby' });
  }
  if (o.slug === 'rainbow-bridge-pet-memorial') {
    links.push({ label: 'Pet memorial jewelry (parent hub)', href: '/pages/memorial-pet' });
    links.push({ label: 'Memorial jewelry for the loss of a dog', href: '/pages/memorial-pet-dog' });
    links.push({ label: 'Memorial jewelry for the loss of a cat', href: '/pages/memorial-pet-cat' });
  }
  if (o.slug === 'in-memory-of-grandmother-jewelry') {
    links.push({ label: 'Memorial jewelry for the loss of a grandmother', href: '/pages/memorial-grandmother' });
  }
  if (o.slug === 'widow-memorial-jewelry') {
    links.push({ label: 'Memorial jewelry for the loss of a spouse', href: '/pages/memorial-spouse' });
    links.push({ label: 'Memorial jewelry for the loss of a husband', href: '/pages/memorial-husband' });
    links.push({ label: 'Memorial jewelry for the loss of a wife', href: '/pages/memorial-wife' });
  }
  if (o.slug === 'sympathy-gift-jewelry') {
    links.push({ label: 'Memorial jewelry (all loss types)', href: '/memorial' });
  }
  if (o.slug === 'anniversary-jewelry-symbolism') {
    links.push({ label: 'Anniversary jewelry gifts for a wife', href: '/pages/gift-wife-anniversary' });
    links.push({ label: 'Anniversary jewelry gifts for a husband', href: '/pages/gift-husband-anniversary' });
  }
  if (o.slug === 'graduation-talisman') {
    links.push({ label: 'Graduation jewelry gifts for a daughter', href: '/pages/gift-daughter-graduation' });
    links.push({ label: 'Raven symbolism in jewelry', href: '/pages/raven-symbolism' });
  }

  // Generic talisman link for milestones / transitions
  if (o.kind === 'milestone' || o.kind === 'transition') {
    links.push({ label: 'Raven symbolism — transformation and threshold', href: '/pages/raven-symbolism' });
    links.push({ label: 'Snake symbolism — shedding and renewal', href: '/pages/snake-symbolism' });
    links.push({ label: 'Moon symbolism — the patient cycle', href: '/pages/moon-symbolism' });
  }

  return links.slice(0, 6);
}

// ─── Body composers ─────────────────────────────────────────────────────────

type GiftGuideContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  why_this_symbol: string;
  how_to_choose: string;
  presentation: string;
  for_whom: string;
  faq: Array<{ q: string; a: string }>;
};

type IntersectionContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  why_this_pairing: string;
  about_the_material: string;
  about_the_symbol: string;
  how_to_wear: string;
  care: string;
  faq: Array<{ q: string; a: string }>;
};

type OccasionContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  what_it_marks: string;
  choosing: string;
  giving_or_keeping: string;
  for_whom: string;
  blessing: string;
  faq: Array<{ q: string; a: string }>;
};

function giftGuideBody(c: GiftGuideContent, products: ProductCardData[], label: string, links: InternalLink[]): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>Why this symbol for this person</h2>`,
    paragraphs(stripLeadingHeader(c.why_this_symbol, 'Why this symbol')),
    `<h2>How to choose the right piece</h2>`,
    paragraphs(stripLeadingHeader(c.how_to_choose, 'How to choose')),
    renderProductGrid(`${label} — pieces to consider`, products),
    `<h2>On giving it</h2>`,
    paragraphs(stripLeadingHeader(c.presentation, 'On giving it')),
    `<h2>For whom these gifts are made</h2>`,
    paragraphs(stripLeadingHeader(c.for_whom, 'For whom')),
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

function intersectionBody(c: IntersectionContent, products: ProductCardData[], label: string, links: InternalLink[]): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>Why this pairing</h2>`,
    paragraphs(stripLeadingHeader(c.why_this_pairing, 'Why')),
    `<h2>About the material</h2>`,
    paragraphs(stripLeadingHeader(c.about_the_material, 'About the')),
    `<h2>About the symbol</h2>`,
    paragraphs(stripLeadingHeader(c.about_the_symbol, 'About the')),
    renderProductGrid(`${label} — current pieces`, products),
    `<h2>How to wear it</h2>`,
    paragraphs(stripLeadingHeader(c.how_to_wear, 'How to wear')),
    `<h2>Care</h2>`,
    paragraphs(stripLeadingHeader(c.care, 'Care')),
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

function occasionBody(c: OccasionContent, products: ProductCardData[], label: string, links: InternalLink[], kind: string): string {
  const blessing = c.blessing
    ? `<blockquote><p><em>${escapeHtml(c.blessing)}</em></p></blockquote>`
    : '';
  const givingHeading =
    kind === 'milestone' ? 'Marking it' : 'Giving it, or keeping it for yourself';
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>What the piece marks</h2>`,
    paragraphs(stripLeadingHeader(c.what_it_marks, 'What the piece marks')),
    `<h2>Choosing a piece</h2>`,
    paragraphs(stripLeadingHeader(c.choosing, 'Choosing')),
    renderProductGrid(`${label} — pieces to consider`, products),
    `<h2>${escapeHtml(givingHeading)}</h2>`,
    paragraphs(stripLeadingHeader(c.giving_or_keeping, kind === 'milestone' ? 'Marking it' : 'Giving it')),
    `<h2>For whom these pieces are made</h2>`,
    paragraphs(stripLeadingHeader(c.for_whom, 'For whom')),
    blessing,
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

// ─── Page entries ───────────────────────────────────────────────────────────

type PageEntry = {
  handle: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

function loadJsonIfExists<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

async function buildEntries(buckets: Set<string>): Promise<PageEntry[]> {
  const root = path.join(process.cwd(), 'src', 'content');
  const entries: PageEntry[] = [];

  if (buckets.has('gift-guides')) {
    for (const g of GIFT_GUIDES) {
      const c = loadJsonIfExists<GiftGuideContent>(path.join(root, 'gift-guides', `${g.slug}.json`));
      if (!c) {
        console.log(`  · gift-guides/${g.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(g.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForGift(g);
      entries.push({
        handle: g.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: giftGuideBody(c, products, g.label, links),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('intersections')) {
    for (const i of INTERSECTIONS) {
      const c = loadJsonIfExists<IntersectionContent>(path.join(root, 'intersections', `${i.slug}.json`));
      if (!c) {
        console.log(`  · intersections/${i.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(i.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForIntersection(i);
      entries.push({
        handle: i.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: intersectionBody(c, products, i.label, links),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('occasions')) {
    for (const o of OCCASIONS) {
      const c = loadJsonIfExists<OccasionContent>(path.join(root, 'occasions', `${o.slug}.json`));
      if (!c) {
        console.log(`  · occasions/${o.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(o.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForOccasion(o);
      entries.push({
        handle: o.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: occasionBody(c, products, o.label, links, o.kind),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  return entries;
}

// ─── Page upserts ───────────────────────────────────────────────────────────

type ExistingPage = { id: string; handle: string };

async function findPageByHandle(handle: string): Promise<ExistingPage | null> {
  const data = await gql<{ pages: { nodes: ExistingPage[] } }>(
    `query Find($q: String!) {
      pages(first: 1, query: $q) {
        nodes { id handle }
      }
    }`,
    { q: `handle:${handle}` },
  );
  return data.pages.nodes[0] ?? null;
}

const PAGE_CREATE = `
  mutation PageCreate($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page { id handle }
      userErrors { field message }
    }
  }
`;

const PAGE_UPDATE = `
  mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page { id handle templateSuffix }
      userErrors { field message }
    }
  }
`;

async function upsertPage(entry: PageEntry): Promise<void> {
  const existing = await findPageByHandle(entry.handle);
  const pageInput = {
    title: entry.title,
    handle: entry.handle,
    body: entry.body,
    isPublished: true,
    templateSuffix: 'pseo',
  };

  if (existing) {
    const data = await gql<{
      pageUpdate: { page: { handle: string; templateSuffix: string }; userErrors: Array<{ message: string }> };
    }>(PAGE_UPDATE, { id: existing.id, page: pageInput });
    if (data.pageUpdate.userErrors?.length) {
      console.error(`  ✗ ${entry.handle}: ${data.pageUpdate.userErrors.map((e) => e.message).join('; ')}`);
    } else {
      console.log(`  ✓ updated /pages/${data.pageUpdate.page.handle} (suffix=${data.pageUpdate.page.templateSuffix})`);
    }
  } else {
    const data = await gql<{
      pageCreate: { page: { handle: string }; userErrors: Array<{ message: string }> };
    }>(PAGE_CREATE, { page: pageInput });
    if (data.pageCreate.userErrors?.length) {
      console.error(`  ✗ ${entry.handle}: ${data.pageCreate.userErrors.map((e) => e.message).join('; ')}`);
    } else {
      console.log(`  ✓ created /pages/${data.pageCreate.page.handle}`);
      // Set templateSuffix explicitly via a follow-up update since PageCreateInput
      // historically ignored templateSuffix in older versions. Belt-and-suspenders.
      const newPage = await findPageByHandle(entry.handle);
      if (newPage) {
        await gql(PAGE_UPDATE, { id: newPage.id, page: { templateSuffix: 'pseo' } });
      }
    }
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const allBuckets = ['gift-guides', 'intersections', 'occasions'];
  const buckets = new Set(args.length > 0 ? args.filter((a) => allBuckets.includes(a)) : allBuckets);
  if (buckets.size === 0) {
    console.error(`No valid bucket. Allowed: ${allBuckets.join(', ')}`);
    process.exit(1);
  }

  TOKEN = await mintToken();
  console.log(`Token minted (${TOKEN.slice(0, 12)}...)`);
  console.log(`Buckets: ${[...buckets].join(', ')}`);
  console.log('');

  const entries = await buildEntries(buckets);
  console.log(`Importing ${entries.length} pages to ${STORE_DOMAIN}...`);
  console.log('');
  for (const e of entries) {
    try {
      await upsertPage(e);
    } catch (err) {
      console.error(`  ✗ ${e.handle}: ${(err as Error).message.slice(0, 200)}`);
    }
  }
  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
