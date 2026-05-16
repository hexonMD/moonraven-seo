#!/usr/bin/env tsx
/**
 * Import the 50 Tier 3 pSEO JSON files as native Shopify pages.
 *
 * Buckets: holidays, gift-recipients-tier3, care-occasions, symbols-tier3,
 * materials-tier3.
 *
 * Page handle is the config-level `handle`. templateSuffix='pseo' is set
 * so they render via the existing templates/page.pseo.json theme template
 * installed by scripts/shopify-theme-template.ts.
 *
 * Re-running: reuses existing handles via pageUpdate.
 *
 * Usage:
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier3-to-shopify.ts
 *   SHOPIFY_APP_CLIENT_ID=... SHOPIFY_APP_CLIENT_SECRET=... npx tsx scripts/import-tier3-to-shopify.ts holidays
 */

import fs from 'node:fs';
import path from 'node:path';
import { HOLIDAYS, type HolidayConfig } from '../src/lib/holidays-config.js';
import {
  GIFT_RECIPIENTS_TIER3,
  type GiftRecipientConfig,
} from '../src/lib/gift-recipients-tier3-config.js';
import {
  CARE_OCCASIONS,
  type CareOccasionConfig,
} from '../src/lib/care-occasions-config.js';
import { SYMBOLS_TIER3, type SymbolTier3Config } from '../src/lib/symbols-tier3-config.js';
import {
  MATERIALS_TIER3,
  type MaterialTier3Config,
} from '../src/lib/materials-tier3-config.js';

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

// ─── HTML helpers (kept in sync with import-tier2-to-shopify.ts) ────────────

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

function stripLeadingHeader(text: string, headerPhrase: string): string {
  const trimmed = text.trimStart();
  const normHeader = headerPhrase.toLowerCase().replace(/\s+/g, ' ').trim();
  const firstNewline = trimmed.indexOf('\n');
  const firstLine = (firstNewline === -1 ? trimmed : trimmed.slice(0, firstNewline)).trim();
  const normFirst = firstLine.toLowerCase().replace(/\s+/g, ' ').trim();
  if (
    normFirst === normHeader ||
    normFirst.startsWith(normHeader) ||
    (normFirst.length < 90 &&
      normHeader.split(' ').slice(0, 3).join(' ') &&
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
  if (keywords.length === 0) return [];
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

function pickInternalLinksForHoliday(h: HolidayConfig): InternalLink[] {
  const links: InternalLink[] = [];
  const a = h.anchor.toLowerCase();

  // Anchor → symbolism Hub
  const symbolMap: Record<string, [string, string]> = {
    raven: ['raven-symbolism', 'Raven symbolism in jewelry'],
    moon: ['moon-symbolism', 'Moon and lunar symbolism'],
    feather: ['feather-symbolism', 'Feather symbolism in jewelry'],
    snake: ['snake-symbolism', 'Snake symbolism in jewelry'],
    skull: ['skull-symbolism', 'Skull and memento mori symbolism'],
    wolf: ['wolf-symbolism', 'Wolf symbolism in jewelry'],
    antler: ['antler-symbolism', 'Antler symbolism in jewelry'],
  };
  for (const key of Object.keys(symbolMap)) {
    if (a.includes(key)) {
      links.push({ label: symbolMap[key][1], href: `/pages/${symbolMap[key][0]}` });
      break;
    }
  }

  if (h.tone === 'memorial' || h.anchor === 'memorial') {
    links.push({ label: 'Memorial jewelry (all loss types)', href: '/memorial' });
  }
  if (h.holiday.toLowerCase().includes('anniversary')) {
    links.push({
      label: 'Anniversary jewelry symbolism by year',
      href: '/pages/anniversary-jewelry-symbolism',
    });
    links.push({
      label: 'Handcrafted anniversary jewelry for a wife',
      href: '/pages/gift-wife-anniversary',
    });
  }
  if (h.holiday.toLowerCase().includes('mother')) {
    links.push({
      label: 'Memorial jewelry for the loss of a mother',
      href: '/pages/memorial-mother',
    });
  }
  if (h.holiday.toLowerCase().includes('father')) {
    links.push({
      label: 'Memorial jewelry for the loss of a father',
      href: '/pages/memorial-father',
    });
  }
  if (h.slug === 'engagement-raven-ring-meaning') {
    links.push({ label: 'Sterling silver raven jewelry', href: '/pages/sterling-silver-raven-jewelry' });
    links.push({ label: 'Bronze raven jewelry', href: '/pages/bronze-raven-jewelry' });
  }
  if (h.slug === 'graduation-jewelry-symbolism-gift') {
    links.push({ label: 'Graduation talisman jewelry', href: '/pages/graduation-talisman' });
    links.push({
      label: 'Graduation jewelry gifts for a daughter',
      href: '/pages/gift-daughter-graduation',
    });
  }

  return links.slice(0, 6);
}

function pickInternalLinksForRecipient(g: GiftRecipientConfig): InternalLink[] {
  const links: InternalLink[] = [];
  const a = g.anchor.toLowerCase();

  if (a === 'witch' || a === 'pagan') {
    links.push({ label: 'Jewelry gifts for a witch', href: '/pages/gift-witch' });
    links.push({ label: 'Raven symbolism in jewelry', href: '/pages/raven-symbolism' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }
  if (a === 'talisman') {
    links.push({
      label: 'Talisman jewelry gifts for a daughter',
      href: '/pages/gift-daughter-talisman',
    });
  }
  if (a === 'stepmother') {
    links.push({ label: 'Meaningful jewelry gifts for a grandmother', href: '/pages/gift-grandmother' });
  }
  if (a === 'memorial' || g.slug.includes('memorial')) {
    links.push({
      label: 'Memorial jewelry for the loss of a grandmother',
      href: '/pages/memorial-grandmother',
    });
    links.push({
      label: 'In memory of grandmother jewelry',
      href: '/pages/in-memory-of-grandmother-jewelry',
    });
  }
  if (a === 'friendship' || a === 'mentor' || a === 'creative practice') {
    links.push({ label: 'Raven symbolism in jewelry', href: '/pages/raven-symbolism' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }
  if (a === 'protection') {
    links.push({ label: 'Snake symbolism in jewelry', href: '/pages/snake-symbolism' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }
  if (a === 'practice') {
    links.push({ label: 'Snake symbolism in jewelry', href: '/pages/snake-symbolism' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }

  return links.slice(0, 6);
}

function pickInternalLinksForCareOccasion(o: CareOccasionConfig): InternalLink[] {
  const links: InternalLink[] = [];

  if (o.slug === 'retirement-self-gift-jewelry') {
    links.push({
      label: 'Retirement jewelry symbolism by symbol',
      href: '/pages/retirement-jewelry-symbolism',
    });
  }
  if (o.slug === 'new-home-blessing-jewelry') {
    links.push({ label: 'Moving away keepsake jewelry', href: '/pages/moving-away-keepsake' });
    links.push({ label: 'New chapter jewelry', href: '/pages/new-chapter-jewelry' });
  }
  if (o.slug === 'cancer-remission-anniversary-jewelry') {
    links.push({
      label: 'Cancer survivor talisman jewelry',
      href: '/pages/cancer-survivor-talisman',
    });
  }
  if (o.slug === 'mother-of-bride-memorial-jewelry') {
    links.push({
      label: 'Memorial jewelry for the loss of a mother',
      href: '/pages/memorial-mother',
    });
    links.push({ label: 'Sympathy gift jewelry', href: '/pages/sympathy-gift-jewelry' });
  }
  if (o.slug === 'postpartum-mother-talisman-jewelry') {
    links.push({ label: 'Meaningful jewelry gifts for mom', href: '/pages/gift-mom-raven' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }
  if (o.slug === 'empty-nest-jewelry-mother') {
    links.push({ label: 'Meaningful jewelry gifts for mom', href: '/pages/gift-mom-raven' });
    links.push({ label: 'New chapter jewelry', href: '/pages/new-chapter-jewelry' });
  }
  if (o.slug === 'adoption-day-keepsake-jewelry' || o.slug === 'coming-out-pride-jewelry-meaningful') {
    links.push({ label: 'New chapter jewelry', href: '/pages/new-chapter-jewelry' });
    links.push({ label: 'Raven symbolism in jewelry', href: '/pages/raven-symbolism' });
  }
  if (o.slug === 'deployment-keepsake-jewelry-military') {
    links.push({ label: 'Moving away keepsake jewelry', href: '/pages/moving-away-keepsake' });
    links.push({ label: 'Celtic knot symbolism in jewelry', href: '/pages/celtic-knot-symbolism' });
  }
  if (o.slug === 'get-well-gift-handcrafted-jewelry') {
    links.push({ label: 'Sympathy gift jewelry', href: '/pages/sympathy-gift-jewelry' });
    links.push({ label: 'Snake symbolism — shedding and renewal', href: '/pages/snake-symbolism' });
  }

  return links.slice(0, 6);
}

function pickInternalLinksForSymbol(s: SymbolTier3Config): InternalLink[] {
  const links: InternalLink[] = [];
  // Always cross-link to the closest tier-1 symbol if there's a family
  // relationship.
  if (s.symbol === 'moth' || s.symbol === 'butterfly') {
    links.push({ label: 'Feather symbolism in jewelry', href: '/pages/feather-symbolism' });
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
  }
  if (s.symbol === 'owl' || s.symbol === 'fox') {
    links.push({ label: 'Raven symbolism in jewelry', href: '/pages/raven-symbolism' });
    links.push({ label: 'Wolf symbolism in jewelry', href: '/pages/wolf-symbolism' });
  }
  if (s.symbol === 'bee' || s.symbol === 'scarab beetle') {
    links.push({ label: 'Antler symbolism in jewelry', href: '/pages/antler-symbolism' });
    links.push({ label: 'Bone symbolism in jewelry', href: '/pages/bone-symbolism' });
  }
  if (s.symbol === 'octopus' || s.symbol === 'anchor') {
    links.push({ label: 'Snake symbolism in jewelry', href: '/pages/snake-symbolism' });
    links.push({ label: 'Wolf symbolism in jewelry', href: '/pages/wolf-symbolism' });
  }
  if (s.symbol === 'dragon') {
    links.push({ label: 'Snake symbolism in jewelry', href: '/pages/snake-symbolism' });
    links.push({ label: 'Celtic knot symbolism', href: '/pages/celtic-knot-symbolism' });
    links.push({ label: 'Norse runes symbolism', href: '/pages/norse-runes-symbolism' });
  }
  if (s.symbol === 'sun and moon') {
    links.push({ label: 'Moon and lunar symbolism', href: '/pages/moon-symbolism' });
    links.push({ label: 'Celtic knot symbolism', href: '/pages/celtic-knot-symbolism' });
  }
  // Material partner pages
  links.push({ label: 'Sterling silver — properties and care', href: '/pages/sterling-silver-jewelry' });
  links.push({ label: 'Oxidized bronze — properties and care', href: '/pages/oxidized-bronze-jewelry' });
  return links.slice(0, 6);
}

function pickInternalLinksForMaterial(m: MaterialTier3Config): InternalLink[] {
  const links: InternalLink[] = [];
  // Cross-link to the tier-1 materials hub
  links.push({
    label: 'Sterling silver — properties and care',
    href: '/pages/sterling-silver-jewelry',
  });
  links.push({
    label: 'Solid bronze — properties and care',
    href: '/pages/solid-bronze-jewelry',
  });
  if (m.slug === 'oxidized-silver-jewelry-meaning' || m.slug === 'antique-finish-jewelry-care') {
    links.push({
      label: 'Oxidized bronze — properties and care',
      href: '/pages/oxidized-bronze-jewelry',
    });
  }
  if (m.slug === 'recycled-sterling-silver-ethics' || m.slug === 'hand-forged-jewelry-difference') {
    links.push({ label: 'Copper jewelry properties', href: '/pages/copper-jewelry' });
  }
  if (m.slug === 'gemstone-set-sterling-silver-jewelry') {
    links.push({
      label: 'Raven symbolism — choosing your symbol',
      href: '/pages/raven-symbolism',
    });
  }
  if (m.slug === 'mokume-gane-jewelry-explained' || m.slug === 'lost-wax-cast-jewelry-explained') {
    links.push({ label: 'White bronze jewelry', href: '/pages/white-bronze-jewelry' });
  }
  return links.slice(0, 6);
}

// ─── Content types ──────────────────────────────────────────────────────────

type HolidayContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  for_whom: string;
  why_this_symbol: string;
  how_to_choose: string;
  presentation: string;
  faq: Array<{ q: string; a: string }>;
};

type GiftRecipientContent = HolidayContent; // identical schema

type CareOccasionContent = {
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

// ─── Body composers ─────────────────────────────────────────────────────────

function holidayBody(
  c: HolidayContent,
  products: ProductCardData[],
  label: string,
  links: InternalLink[],
): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>For whom these gifts are made</h2>`,
    paragraphs(stripLeadingHeader(c.for_whom, 'For whom')),
    `<h2>Why this symbol for this holiday</h2>`,
    paragraphs(stripLeadingHeader(c.why_this_symbol, 'Why this symbol')),
    `<h2>How to choose the right piece</h2>`,
    paragraphs(stripLeadingHeader(c.how_to_choose, 'How to choose')),
    renderProductGrid(`${label} — pieces to consider`, products),
    `<h2>On giving it</h2>`,
    paragraphs(stripLeadingHeader(c.presentation, 'On giving it')),
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

function recipientBody(
  c: GiftRecipientContent,
  products: ProductCardData[],
  label: string,
  links: InternalLink[],
): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>For whom these gifts are made</h2>`,
    paragraphs(stripLeadingHeader(c.for_whom, 'For whom')),
    `<h2>Why this symbol for this person</h2>`,
    paragraphs(stripLeadingHeader(c.why_this_symbol, 'Why this symbol')),
    `<h2>How to choose the right piece</h2>`,
    paragraphs(stripLeadingHeader(c.how_to_choose, 'How to choose')),
    renderProductGrid(`${label} — pieces to consider`, products),
    `<h2>On giving it</h2>`,
    paragraphs(stripLeadingHeader(c.presentation, 'On giving it')),
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

function careOccasionBody(
  c: CareOccasionContent,
  products: ProductCardData[],
  label: string,
  links: InternalLink[],
  kind: CareOccasionConfig['kind'],
): string {
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

function symbolBody(
  c: SymbolContent,
  products: ProductCardData[],
  label: string,
  links: InternalLink[],
): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>What the symbol means</h2>`,
    paragraphs(stripLeadingHeader(c.meaning, 'What the')),
    `<h2>In jewelry</h2>`,
    paragraphs(stripLeadingHeader(c.in_jewelry, 'The ')),
    renderProductGrid(`${label} — current pieces`, products),
    `<h2>How to wear it</h2>`,
    paragraphs(stripLeadingHeader(c.how_to_wear, 'How to wear')),
    renderInternalLinks(links),
    renderFaqSection(c.faq),
  ].join('\n\n');
}

function materialBody(
  c: MaterialContent,
  products: ProductCardData[],
  label: string,
  links: InternalLink[],
): string {
  return [
    PSEO_STYLES,
    faqJsonLd(c.faq),
    paragraphs(c.intro),
    `<h2>About the material</h2>`,
    paragraphs(stripLeadingHeader(c.properties, 'About')),
    `<h2>Care</h2>`,
    paragraphs(stripLeadingHeader(c.care, 'Care')),
    renderProductGrid(`${label} — current pieces`, products),
    `<h2>Who chooses this</h2>`,
    paragraphs(stripLeadingHeader(c.who_chooses, 'Who chooses')),
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

  if (buckets.has('holidays')) {
    for (const h of HOLIDAYS) {
      const c = loadJsonIfExists<HolidayContent>(path.join(root, 'holidays', `${h.slug}.json`));
      if (!c) {
        console.log(`  · holidays/${h.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(h.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForHoliday(h);
      entries.push({
        handle: h.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: holidayBody(c, products, h.label, links),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('gift-recipients-tier3')) {
    for (const g of GIFT_RECIPIENTS_TIER3) {
      const c = loadJsonIfExists<GiftRecipientContent>(
        path.join(root, 'gift-recipients-tier3', `${g.slug}.json`),
      );
      if (!c) {
        console.log(`  · gift-recipients-tier3/${g.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(g.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForRecipient(g);
      entries.push({
        handle: g.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: recipientBody(c, products, g.label, links),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('care-occasions')) {
    for (const o of CARE_OCCASIONS) {
      const c = loadJsonIfExists<CareOccasionContent>(
        path.join(root, 'care-occasions', `${o.slug}.json`),
      );
      if (!c) {
        console.log(`  · care-occasions/${o.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(o.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForCareOccasion(o);
      entries.push({
        handle: o.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: careOccasionBody(c, products, o.label, links, o.kind),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('symbols-tier3')) {
    for (const s of SYMBOLS_TIER3) {
      const c = loadJsonIfExists<SymbolContent>(
        path.join(root, 'symbols-tier3', `${s.slug}.json`),
      );
      if (!c) {
        console.log(`  · symbols-tier3/${s.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(s.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForSymbol(s);
      entries.push({
        handle: s.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: symbolBody(c, products, s.label, links),
        seoTitle: c.seo_title,
        seoDescription: c.meta_description,
      });
    }
  }

  if (buckets.has('materials-tier3')) {
    for (const m of MATERIALS_TIER3) {
      const c = loadJsonIfExists<MaterialContent>(
        path.join(root, 'materials-tier3', `${m.slug}.json`),
      );
      if (!c) {
        console.log(`  · materials-tier3/${m.slug}: no content file, skipping`);
        continue;
      }
      const products = await searchProductsForKeywords(m.productFilters, 12).catch(
        () => [] as ProductCardData[],
      );
      const links = pickInternalLinksForMaterial(m);
      entries.push({
        handle: m.handle,
        title: c.seo_title.split(/\s*[|·–—]\s*/)[0].slice(0, 70),
        body: materialBody(c, products, m.label, links),
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

async function upsertPage(entry: PageEntry): Promise<{ ok: boolean; created: boolean }> {
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
      pageUpdate: {
        page: { handle: string; templateSuffix: string };
        userErrors: Array<{ message: string }>;
      };
    }>(PAGE_UPDATE, { id: existing.id, page: pageInput });
    if (data.pageUpdate.userErrors?.length) {
      console.error(
        `  ✗ ${entry.handle}: ${data.pageUpdate.userErrors.map((e) => e.message).join('; ')}`,
      );
      return { ok: false, created: false };
    }
    console.log(
      `  ✓ updated /pages/${data.pageUpdate.page.handle} (suffix=${data.pageUpdate.page.templateSuffix})`,
    );
    return { ok: true, created: false };
  }

  const data = await gql<{
    pageCreate: { page: { handle: string }; userErrors: Array<{ message: string }> };
  }>(PAGE_CREATE, { page: pageInput });
  if (data.pageCreate.userErrors?.length) {
    console.error(
      `  ✗ ${entry.handle}: ${data.pageCreate.userErrors.map((e) => e.message).join('; ')}`,
    );
    return { ok: false, created: false };
  }
  console.log(`  ✓ created /pages/${data.pageCreate.page.handle}`);
  // Belt-and-suspenders: force templateSuffix
  const newPage = await findPageByHandle(entry.handle);
  if (newPage) {
    await gql(PAGE_UPDATE, { id: newPage.id, page: { templateSuffix: 'pseo' } });
  }
  return { ok: true, created: true };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const allBuckets = [
    'holidays',
    'gift-recipients-tier3',
    'care-occasions',
    'symbols-tier3',
    'materials-tier3',
  ];
  const buckets = new Set(
    args.length > 0 ? args.filter((a) => allBuckets.includes(a)) : allBuckets,
  );
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
  let ok = 0;
  let failed = 0;
  let created = 0;
  for (const e of entries) {
    try {
      const r = await upsertPage(e);
      if (r.ok) {
        ok += 1;
        if (r.created) created += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${e.handle}: ${(err as Error).message.slice(0, 200)}`);
    }
  }
  console.log('');
  console.log(`Done. ${ok} ok (${created} created, ${ok - created} updated), ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
