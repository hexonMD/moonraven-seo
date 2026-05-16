#!/usr/bin/env tsx
/**
 * Pinterest Rich Pin meta tags injector for moonraven.com.
 *
 * Live audit (2026-05-16) showed:
 *  - Product pages have og:title, og:description, og:image, og:url,
 *    og:price:amount, og:price:currency. MISSING: og:availability,
 *    og:product:retailer_item_id, product:price:amount, product:price:currency.
 *  - /pages/* (pSEO) pages have og:type=website (should be article for Rich Pins),
 *    no article:published_time, no article:author, no og:image.
 *
 * This script patches theme.liquid to inject the missing tags inside <head>.
 * Idempotent — re-running is a no-op because we wrap our block in a marker
 * comment ("<!-- pinterest-rich-pins:start -->") and replace by marker.
 *
 * Run: SHOPIFY_APP_CLIENT_ID=… SHOPIFY_APP_CLIENT_SECRET=… npx tsx scripts/pinterest-rich-pins.ts
 *
 * Pass --dry-run to print the patched theme.liquid to stdout without uploading.
 */

import fs from 'node:fs';
import path from 'node:path';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';
const DRY_RUN = process.argv.includes('--dry-run');

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

async function findPublishedTheme(): Promise<{ id: string; name: string }> {
  const data = await gql<{ themes: { nodes: Array<{ id: string; name: string; role: string }> } }>(
    `{ themes(first: 20) { nodes { id name role } } }`,
  );
  const main = data.themes.nodes.find((t) => t.role === 'MAIN');
  if (!main) throw new Error('No MAIN theme');
  return { id: main.id, name: main.name };
}

async function readThemeFile(themeId: string, filename: string): Promise<string> {
  const data = await gql<{
    theme: { files: { nodes: Array<{ filename: string; body: { content: string } | null }> } };
  }>(
    `query ReadFile($id: ID!, $filenames: [String!]) {
      theme(id: $id) {
        files(filenames: $filenames, first: 1) {
          nodes { filename body { ... on OnlineStoreThemeFileBodyText { content } } }
        }
      }
    }`,
    { id: themeId, filenames: [filename] },
  );
  const node = data.theme.files.nodes[0];
  if (!node || !node.body) throw new Error(`File ${filename} not found or not text`);
  return node.body.content;
}

async function writeThemeFile(themeId: string, filename: string, content: string): Promise<void> {
  const data = await gql<{
    themeFilesUpsert: {
      upsertedThemeFiles: Array<{ filename: string }>;
      userErrors: Array<{ message: string; filename: string }>;
    };
  }>(
    `mutation Up($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
      themeFilesUpsert(themeId: $themeId, files: $files) {
        upsertedThemeFiles { filename }
        userErrors { message filename }
      }
    }`,
    { themeId, files: [{ filename, body: { type: 'TEXT', value: content } }] },
  );
  if (data.themeFilesUpsert.userErrors?.length) {
    throw new Error(data.themeFilesUpsert.userErrors.map((e) => `${e.filename}: ${e.message}`).join('; '));
  }
  console.log(`  wrote ${data.themeFilesUpsert.upsertedThemeFiles[0]?.filename}`);
}

// ─── The Liquid block we inject ─────────────────────────────────────────────
//
// Strategy: inject one block that branches on template.name. Shopify exposes
// `product` on product templates and `page` on page templates. We never break
// existing tags — we only ADD what's missing.
//
// Product Rich Pin extras: og:availability, og:product:retailer_item_id,
//   product:price:amount, product:price:currency.
//
// Article Rich Pin (for /pages/*-symbolism, /pages/memorial-*, etc): override
//   og:type to "article", add article:published_time + article:author + og:image
//   fallback (page.image is rare; we fall back to shop logo if absent).

const PIN_BLOCK_MARKER_START = '<!-- pinterest-rich-pins:start -->';
const PIN_BLOCK_MARKER_END = '<!-- pinterest-rich-pins:end -->';

const PIN_BLOCK = `${PIN_BLOCK_MARKER_START}
{%- comment -%}
  Pinterest Rich Pin meta tags. Injected by scripts/pinterest-rich-pins.ts.
  Adds the fields Pinterest's crawler requires beyond what Shopify's default
  og: block emits. Branches by template:
    - product template → Product Rich Pin (availability, retailer item id, product:* prefix)
    - page template (pSEO content pages) → Article Rich Pin (og:type=article + article:*)
{%- endcomment -%}

{%- if template.name == 'product' and product -%}
  {%- assign sv = product.selected_or_first_available_variant -%}
  <meta property="og:availability" content="{% if sv.available %}instock{% else %}oos{% endif %}">
  <meta property="og:product:retailer_item_id" content="{{ sv.sku | default: sv.id | default: product.id }}">
  <meta property="product:price:amount" content="{{ sv.price | money_without_currency | strip_html | replace: ',', '' }}">
  <meta property="product:price:currency" content="{{ cart.currency.iso_code | default: shop.currency }}">
  <meta property="product:availability" content="{% if sv.available %}in stock{% else %}out of stock{% endif %}">
  <meta property="product:condition" content="new">
  <meta property="product:brand" content="{{ product.vendor | default: shop.name | escape }}">
{%- endif -%}

{%- if template.name == 'page' and page -%}
  {%- comment -%}
    Override og:type for pSEO content pages. Pinterest's Article Rich Pin
    requires og:type=article + article:published_time + article:author.
    We always emit these for /pages/* — Shopify's default emits og:type=website
    for pages, which Pinterest treats as a generic pin (no rich preview).
  {%- endcomment -%}
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="{{ page.published_at | date: '%Y-%m-%dT%H:%M:%S%z' | default: page.created_at | date: '%Y-%m-%dT%H:%M:%S%z' }}">
  <meta property="article:modified_time" content="{{ page.updated_at | date: '%Y-%m-%dT%H:%M:%S%z' }}">
  <meta property="article:author" content="{{ page.author | default: shop.name | escape }}">
  <meta property="article:section" content="Jewelry & Symbolism">
  {%- if page.image -%}
    <meta property="og:image" content="https:{{ page.image | image_url: width: 1200 }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="{{ 1200 | divided_by: page.image.aspect_ratio | round }}">
  {%- elsif shop.brand.square_logo -%}
    <meta property="og:image" content="https:{{ shop.brand.square_logo | image_url: width: 1200 }}">
  {%- elsif shop.brand.logo -%}
    <meta property="og:image" content="https:{{ shop.brand.logo | image_url: width: 1200 }}">
  {%- else -%}
    {%- comment -%}
      Hardcoded brand image fallback. Pinterest's Article Rich Pin requires
      og:image; without it, the pin loses its rich preview and falls back to
      generic share. The Moon Raven logo file is the safest universal fallback
      since the shop has no brand kit configured.
    {%- endcomment -%}
    <meta property="og:image" content="https://moonraven.com/cdn/shop/files/MR_Logo3_Left_BLK_418c00c4-d468-41d9-ba8e-a5c938777ed2.png?width=1200">
  {%- endif -%}
{%- endif -%}

{%- comment -%}
  Homepage and collection pages also benefit from a default og:image so
  share previews on Pinterest/FB/X aren't blank. Shopify's default head
  snippet omits og:image on these template types.
{%- endcomment -%}
{%- unless template.name == 'product' or template.name == 'page' or template.name == 'article' -%}
  {%- if shop.brand.square_logo -%}
    <meta property="og:image" content="https:{{ shop.brand.square_logo | image_url: width: 1200 }}">
  {%- elsif shop.brand.logo -%}
    <meta property="og:image" content="https:{{ shop.brand.logo | image_url: width: 1200 }}">
  {%- else -%}
    <meta property="og:image" content="https://moonraven.com/cdn/shop/files/MR_Logo3_Left_BLK_418c00c4-d468-41d9-ba8e-a5c938777ed2.png?width=1200">
  {%- endif -%}
{%- endunless -%}
${PIN_BLOCK_MARKER_END}`;

function injectPinBlock(themeLiquid: string): { content: string; changed: boolean; reason: string } {
  // Idempotent replace: if our marker already exists, swap it.
  if (themeLiquid.includes(PIN_BLOCK_MARKER_START)) {
    const start = themeLiquid.indexOf(PIN_BLOCK_MARKER_START);
    const end = themeLiquid.indexOf(PIN_BLOCK_MARKER_END) + PIN_BLOCK_MARKER_END.length;
    if (end <= start) return { content: themeLiquid, changed: false, reason: 'marker malformed' };
    const existing = themeLiquid.slice(start, end);
    if (existing === PIN_BLOCK) return { content: themeLiquid, changed: false, reason: 'already up to date' };
    return {
      content: themeLiquid.slice(0, start) + PIN_BLOCK + themeLiquid.slice(end),
      changed: true,
      reason: 'replaced existing block',
    };
  }

  // First install — inject INSIDE <head>, BEFORE `{%- render 'head' -%}`.
  // We must run before Shopify's default og: emission so that for /pages/*
  // our og:type=article wins (Open Graph spec: first occurrence is canonical;
  // Pinterest's crawler follows this). For product pages, we only ADD tags
  // that don't conflict, so position is moot there.
  const headOpenRegex = /(<head>\s*)/i;
  if (!headOpenRegex.test(themeLiquid)) {
    throw new Error('No <head> found in theme.liquid — refusing to patch blindly');
  }
  return {
    content: themeLiquid.replace(headOpenRegex, `$1    ${PIN_BLOCK}\n    `),
    changed: true,
    reason: 'injected after <head>, before render head snippet',
  };
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
    process.exit(1);
  }

  TOKEN = await mintToken();
  console.log(`Token minted (${TOKEN.slice(0, 12)}...)`);

  const theme = await findPublishedTheme();
  console.log(`Theme: ${theme.name} (${theme.id})`);

  const original = await readThemeFile(theme.id, 'layout/theme.liquid');
  console.log(`Read layout/theme.liquid (${original.length} bytes)`);

  // Save a local backup before any change
  const backupPath = path.join('scripts', `theme.liquid.backup-${Date.now()}.liquid`);
  fs.writeFileSync(backupPath, original);
  console.log(`Backup saved to ${backupPath}`);

  const { content: patched, changed, reason } = injectPinBlock(original);
  console.log(`Diff: ${reason}`);

  if (!changed) {
    console.log('No changes needed.');
    return;
  }

  if (DRY_RUN) {
    const dryPath = path.join('scripts', `theme.liquid.patched.preview.liquid`);
    fs.writeFileSync(dryPath, patched);
    console.log(`DRY RUN — patched preview written to ${dryPath}`);
    return;
  }

  await writeThemeFile(theme.id, 'layout/theme.liquid', patched);
  console.log('Done. Verify by viewing source on a product page and a /pages/* page.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
