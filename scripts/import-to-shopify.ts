#!/usr/bin/env tsx
/**
 * Import the 42 generated pSEO JSON files as native Shopify pages.
 *
 * Each page goes through the Admin GraphQL `pageCreate` mutation:
 *   - title from seo_title
 *   - body becomes HTML built from the JSON sections
 *   - FAQ JSON-LD injected as inline <script type="application/ld+json">
 *   - handle is a clean keyword-optimized slug
 *   - published immediately
 *
 * Re-running the script: re-uses existing handles to update content rather
 * than creating duplicates (uses `pageUpdate` for pages that already exist).
 *
 * Usage:
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-to-shopify.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { SYMBOLS } from '../src/lib/symbolism-config.js';
import { MEMORIALS } from '../src/lib/memorial-config.js';
import { MATERIALS } from '../src/lib/materials-config.js';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
  process.exit(1);
}

// ─── Token minting (client_credentials grant) ───────────────────────────────

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

// ─── GraphQL helper ─────────────────────────────────────────────────────────

let TOKEN = '';

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

// ─── Page handle lookup ─────────────────────────────────────────────────────

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

// ─── HTML body composers ────────────────────────────────────────────────────

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
  .pseo-product-card__image img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .pseo-product-card__title {
    margin: 0 0 4px;
    font-size: 0.875rem;
    line-height: 1.35;
    text-align: center;
  }
  .pseo-product-card__price {
    margin: 0;
    font-size: 0.875rem;
    color: #6b6b6b;
    text-align: center;
  }
  .pseo-faq { margin-top: 56px; border-top: 1px solid #e4ded4; padding-top: 32px; }
  .pseo-faq h2 { font-size: 1.5rem; margin: 0 0 24px; }
  .pseo-faq-item { border-bottom: 1px solid #ece6dc; padding: 18px 0; }
  .pseo-faq-item h3 {
    font-size: 1rem;
    margin: 0 0 8px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .pseo-faq-item p { margin: 0; color: #4b4b4b; }
  .rte blockquote {
    border-left: 2px solid #a89878;
    padding-left: 18px;
    margin: 28px 0;
    font-style: italic;
    color: #555;
  }
</style>
`.trim();

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

type ProductCardData = {
  handle: string;
  title: string;
  image: string | null;
  price: string | null;
};

async function searchProductsForKeywords(keywords: string[], first = 12): Promise<ProductCardData[]> {
  // Same tag-only Shopify search we use in Next.js, then post-filter on
  // product-name prefix so brand-spam tags don't pollute the grid.
  const clauses = keywords.flatMap((k) => [`tag:${k}`]);
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
  }>(query, { q, first: 60 });

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const filtered = data.products.nodes.filter((p) => {
    const name = p.title.split(/\s[-–—|]\s/)[0]?.toLowerCase() ?? '';
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphs(text: string): string {
  // Split on double-newline; wrap each block in <p>.
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('\n');
}

// Symbolism page body
function symbolismBody(content: SymbolContent, products: ProductCardData[], label: string): string {
  return [
    PSEO_STYLES,
    faqJsonLd(content.faq),
    paragraphs(content.intro),
    `<h2>Meaning</h2>`,
    paragraphs(content.meaning),
    `<h2>In jewelry</h2>`,
    paragraphs(content.in_jewelry),
    `<h2>How to wear it</h2>`,
    paragraphs(content.how_to_wear),
    renderProductGrid(`${label} pieces`, products),
    renderFaqSection(content.faq),
  ].join('\n\n');
}

function memorialBody(content: MemorialContent, products: ProductCardData[]): string {
  const blessing = content.blessing
    ? `<blockquote><p><em>${escapeHtml(content.blessing)}</em></p></blockquote>`
    : '';
  return [
    PSEO_STYLES,
    faqJsonLd(content.faq),
    paragraphs(content.intro),
    `<h2>Choosing the right piece</h2>`,
    paragraphs(content.choosing),
    `<h2>What the piece holds</h2>`,
    paragraphs(content.what_it_carries),
    `<h2>For whom these pieces are made</h2>`,
    paragraphs(content.for_whom),
    blessing,
    renderProductGrid('Memorial pieces to consider', products),
    renderFaqSection(content.faq),
  ].join('\n\n');
}

function materialBody(content: MaterialContent, products: ProductCardData[], label: string): string {
  return [
    PSEO_STYLES,
    faqJsonLd(content.faq),
    paragraphs(content.intro),
    `<h2>Properties</h2>`,
    paragraphs(content.properties),
    `<h2>Care</h2>`,
    paragraphs(content.care),
    `<h2>Who tends to choose this</h2>`,
    paragraphs(content.who_chooses),
    renderProductGrid(`${label} pieces`, products),
    renderFaqSection(content.faq),
  ].join('\n\n');
}

// ─── Content types ──────────────────────────────────────────────────────────

type SymbolContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  meaning: string;
  in_jewelry: string;
  how_to_wear: string;
  faq: Array<{ q: string; a: string }>;
};

type MemorialContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  choosing: string;
  what_it_carries: string;
  for_whom: string;
  blessing: string;
  faq: Array<{ q: string; a: string }>;
};

type MaterialContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  properties: string;
  care: string;
  who_chooses: string;
  faq: Array<{ q: string; a: string }>;
};

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

// ─── Page entries to create ─────────────────────────────────────────────────

type PageEntry = {
  handle: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

async function buildEntries(): Promise<PageEntry[]> {
  const root = path.join(process.cwd(), 'src', 'content');
  const entries: PageEntry[] = [];

  for (const s of SYMBOLS) {
    const file = path.join(root, 'symbolism', `${s.slug}.json`);
    if (!fs.existsSync(file)) continue;
    const c = loadJson<SymbolContent>(file);
    const products = await searchProductsForKeywords(s.matchTerms, 12).catch(() => [] as ProductCardData[]);
    entries.push({
      handle: `${s.slug}-symbolism`,
      title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
      body: symbolismBody(c, products, s.label),
      seoTitle: c.seo_title,
      seoDescription: c.meta_description,
    });
  }
  for (const m of MEMORIALS) {
    const file = path.join(root, 'memorial', `${m.slug}.json`);
    if (!fs.existsSync(file)) continue;
    const c = loadJson<MemorialContent>(file);
    const products = await searchProductsForKeywords(m.productKeywords, 12).catch(() => [] as ProductCardData[]);
    entries.push({
      handle: `memorial-${m.slug}`,
      title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
      body: memorialBody(c, products),
      seoTitle: c.seo_title,
      seoDescription: c.meta_description,
    });
  }
  for (const mat of MATERIALS) {
    const file = path.join(root, 'materials', `${mat.slug}.json`);
    if (!fs.existsSync(file)) continue;
    const c = loadJson<MaterialContent>(file);
    const products = await searchProductsForKeywords(mat.matchTerms, 12).catch(() => [] as ProductCardData[]);
    entries.push({
      handle: `${mat.slug}-jewelry`,
      title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
      body: materialBody(c, products, mat.label),
      seoTitle: c.seo_title,
      seoDescription: c.meta_description,
    });
  }
  return entries;
}

// ─── Page mutations ─────────────────────────────────────────────────────────

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
      page { id handle }
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
  };
  // Note: as of 2025-07, SEO is stored separately via metafields; the Online
  // Store Pages UI exposes seo_title and seo_description but the GraphQL
  // PageCreateInput's `seo` field varies by version. We'll set body's <title>
  // via meta tags in the body for now.

  if (existing) {
    const data = await gql<{ pageUpdate: { page: { handle: string }; userErrors: Array<{ message: string }> } }>(
      PAGE_UPDATE,
      { id: existing.id, page: pageInput },
    );
    if (data.pageUpdate.userErrors?.length) {
      console.error(`  ✗ ${entry.handle}: ${data.pageUpdate.userErrors.map((e) => e.message).join('; ')}`);
    } else {
      console.log(`  ✓ updated /pages/${data.pageUpdate.page.handle}`);
    }
  } else {
    const data = await gql<{ pageCreate: { page: { handle: string }; userErrors: Array<{ message: string }> } }>(
      PAGE_CREATE,
      { page: pageInput },
    );
    if (data.pageCreate.userErrors?.length) {
      console.error(`  ✗ ${entry.handle}: ${data.pageCreate.userErrors.map((e) => e.message).join('; ')}`);
    } else {
      console.log(`  ✓ created /pages/${data.pageCreate.page.handle}`);
    }
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function main() {
  TOKEN = await mintToken();
  console.log(`Token minted (${TOKEN.slice(0, 12)}...)`);

  const entries = await buildEntries();
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
