#!/usr/bin/env tsx
/**
 * Upload a custom page template to the published Shopify theme that
 * actually renders page.content (the Broadcast theme's stock page template
 * has been customized to use section blocks and ignores page body).
 *
 * Then set all 42 imported pSEO pages to use that template via
 * templateSuffix='pseo'.
 */

import { SYMBOLS } from '../src/lib/symbolism-config.js';
import { MEMORIALS } from '../src/lib/memorial-config.js';
import { MATERIALS } from '../src/lib/materials-config.js';
import { GIFT_GUIDES } from '../src/lib/gift-guides-config.js';
import { INTERSECTIONS } from '../src/lib/intersections-config.js';
import { OCCASIONS } from '../src/lib/occasions-config.js';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';

let TOKEN = '';

async function mintToken(): Promise<string> {
  const res = await fetch(`https://${STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`Token mint ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
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

// ─── 1. Find the published theme ────────────────────────────────────────────

async function findPublishedTheme(): Promise<{ id: string; name: string }> {
  const data = await gql<{ themes: { nodes: Array<{ id: string; name: string; role: string }> } }>(
    `{ themes(first: 20) { nodes { id name role } } }`,
  );
  const main = data.themes.nodes.find((t) => t.role === 'MAIN');
  if (!main) throw new Error('No MAIN theme found');
  return { id: main.id, name: main.name };
}

// ─── 2. Upload templates/page.pseo.liquid ──────────────────────────────────

const PSEO_SECTION = `
{%- comment -%}
  Custom section for pSEO pages — renders page title + page.content with FAQ styles.
  Used by templates/page.pseo.json. Section.settings exposed via theme editor too.
{%- endcomment -%}

<div class="page-width pseo-page" style="max-width: 820px; margin: 0 auto; padding: 60px 20px 100px;">
  <header class="pseo-page-header" style="margin-bottom: 36px;">
    <h1 style="font-size: clamp(1.75rem, 3vw, 2.5rem); line-height: 1.15; margin: 0 0 12px; letter-spacing: 0.02em;">
      {{ page.title }}
    </h1>
  </header>
  <div class="rte pseo-body" style="line-height: 1.7; font-size: 1.0625rem;">
    {{ page.content }}
  </div>
</div>

<style>
  .pseo-body h2 {
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.5rem;
    letter-spacing: 0.02em;
  }
  .pseo-body p { margin-bottom: 1.1em; }
  .pseo-body blockquote {
    border-left: 2px solid #a89878;
    padding-left: 1.25rem;
    margin: 2rem 0;
    font-style: italic;
    color: #555;
  }
  .pseo-body .pseo-faq {
    margin-top: 3.5rem;
    border-top: 1px solid #e4ded4;
    padding-top: 2rem;
  }
  .pseo-body .pseo-faq h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
  }
  .pseo-body .pseo-faq-item {
    border-bottom: 1px solid #ece6dc;
    padding: 1.25rem 0;
  }
  .pseo-body .pseo-faq-item h3 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .pseo-body .pseo-faq-item p {
    margin-bottom: 0;
  }
</style>

{% schema %}
{
  "name": "pSEO Content",
  "settings": [],
  "presets": [
    { "name": "pSEO Content" }
  ]
}
{% endschema %}
`.trim();

// Use Broadcast theme's built-in `main-page` section (which renders page
// content) rather than a custom section. The stock page.json has it disabled
// for some reason; we re-enable it here.
const PSEO_TEMPLATE_JSON = JSON.stringify(
  {
    sections: {
      'main-page': {
        type: 'main-page',
        settings: {
          show_title: true,
          show_content: true,
          width: 'wrapper',
          padding_top: 50,
          padding_bottom: 100,
          heading_font_size: 'heading-medium',
          text_font_size: 'body-small',
          align_text: 'text-left',
          heading_tag: 'automatic',
          subheading: '',
          color_scheme: '',
        },
      },
    },
    order: ['main-page'],
  },
  null,
  2,
);

async function uploadTemplate(themeId: string): Promise<void> {
  // Upload BOTH the section liquid file and the JSON template that references
  // it. Online Store 2.0 themes (which Broadcast is) prefer JSON templates;
  // they only honor an alternate template suffix if a JSON file matches.
  // First delete the old .liquid attempt if present to avoid conflicts.
  await gql(
    `mutation Del($themeId: ID!, $files: [String!]!) {
      themeFilesDelete(themeId: $themeId, files: $files) {
        deletedThemeFiles { filename }
        userErrors { message }
      }
    }`,
    { themeId, files: ['templates/page.pseo.liquid'] },
  ).catch(() => undefined);

  const data = await gql<{
    themeFilesUpsert: {
      upsertedThemeFiles: Array<{ filename: string }>;
      userErrors: Array<{ message: string; filename: string }>;
    };
  }>(
    `mutation UploadTemplate($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
      themeFilesUpsert(themeId: $themeId, files: $files) {
        upsertedThemeFiles { filename }
        userErrors { message filename }
      }
    }`,
    {
      themeId,
      files: [
        { filename: 'templates/page.pseo.json', body: { type: 'TEXT', value: PSEO_TEMPLATE_JSON } },
      ],
    },
  );
  if (data.themeFilesUpsert.userErrors?.length) {
    throw new Error(
      `Theme file upload errors: ${data.themeFilesUpsert.userErrors.map((e) => `${e.filename}: ${e.message}`).join('; ')}`,
    );
  }
  for (const f of data.themeFilesUpsert.upsertedThemeFiles) {
    console.log(`✓ Uploaded ${f.filename}`);
  }
}

// ─── 3. Set templateSuffix on each pSEO page ───────────────────────────────

function getAllHandles(): string[] {
  return [
    // Tier 1
    ...SYMBOLS.map((s) => `${s.slug}-symbolism`),
    ...MEMORIALS.map((m) => `memorial-${m.slug}`),
    ...MATERIALS.map((m) => `${m.slug}-jewelry`),
    // Tier 2
    ...GIFT_GUIDES.map((g) => g.handle),
    ...INTERSECTIONS.map((i) => i.handle),
    ...OCCASIONS.map((o) => o.handle),
  ];
}

async function findPageId(handle: string): Promise<string | null> {
  const data = await gql<{ pages: { nodes: Array<{ id: string }> } }>(
    `query Find($q: String!) { pages(first: 1, query: $q) { nodes { id } } }`,
    { q: `handle:${handle}` },
  );
  return data.pages.nodes[0]?.id ?? null;
}

async function setTemplateSuffix(pageId: string, handle: string): Promise<void> {
  const data = await gql<{ pageUpdate: { page: { handle: string }; userErrors: Array<{ message: string }> } }>(
    `mutation SetSuffix($id: ID!, $page: PageUpdateInput!) {
      pageUpdate(id: $id, page: $page) {
        page { handle templateSuffix }
        userErrors { field message }
      }
    }`,
    { id: pageId, page: { templateSuffix: 'pseo' } },
  );
  if (data.pageUpdate.userErrors?.length) {
    console.error(`  ✗ ${handle}: ${data.pageUpdate.userErrors.map((e) => e.message).join('; ')}`);
  } else {
    console.log(`  ✓ ${handle} → templateSuffix=pseo`);
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('SHOPIFY_APP_CLIENT_ID and SHOPIFY_APP_CLIENT_SECRET required');
    process.exit(1);
  }

  TOKEN = await mintToken();
  console.log(`Token minted (${TOKEN.slice(0, 12)}...)`);

  const theme = await findPublishedTheme();
  console.log(`Published theme: ${theme.name}`);
  console.log('');

  console.log('Uploading templates/page.pseo.liquid...');
  await uploadTemplate(theme.id);
  console.log('');

  const handles = getAllHandles();
  console.log(`Setting templateSuffix on all ${handles.length} pSEO pages...`);
  for (const handle of handles) {
    try {
      const id = await findPageId(handle);
      if (!id) {
        console.log(`  · ${handle}: not found, skipping`);
        continue;
      }
      await setTemplateSuffix(id, handle);
    } catch (err) {
      console.error(`  ✗ ${handle}: ${(err as Error).message.slice(0, 200)}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
