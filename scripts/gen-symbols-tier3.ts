#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Symbol pages (Tier 3).
 *
 * Schema matches Tier 1 symbolism pages: intro / meaning / in_jewelry /
 * how_to_wear / faq, plus seo_title and meta_description.
 *
 * Output: src/content/symbols-tier3/<slug>.json + brief.json
 *
 * Usage:
 *   GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-symbols-tier3.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { SYMBOLS_TIER3, type SymbolTier3Config } from '../src/lib/symbols-tier3-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';
import { addUsage, enforceCap, getState } from './lib-budget.js';

const BUDGET_CAP_USD = Number(process.env.GEMINI_BUDGET_CAP_USD ?? 10);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'symbols-tier3');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Tier 3 symbol pages need higher grounding floor — these are lower-volume
// queries so weak SERPs make for thin pages.
const GROUNDING_FLOOR = 5;

type Brief = {
  primary_keyword: string;
  related_long_tail: string[];
  paa_questions: string[];
  top_serp_titles: string[];
  recommended_h2s: string[];
  content_gaps: string[];
  grounding_score: number;
};

const BRIEF_SYSTEM = `
You are an SEO research analyst preparing a brief for a symbolism-in-jewelry
page. The destination is a handcrafted jeweler — Moon Raven Designs. The
page should answer "what does this symbol mean as jewelry" thoroughly,
sitting at the editorial intersection of mythology, craft, and personal
meaning.

You have google_search grounding — use it on the actual queries provided.
Don't hallucinate SERPs. If the SERP is dominated by Etsy roundups,
Pinterest, and dropshipper sites with no real mythology content, say so via
grounding_score.

Output ONLY a JSON object — no fences, no commentary.
`.trim();

function briefPrompt(s: SymbolTier3Config): string {
  const queries = [s.primaryQuery, ...s.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Symbol: ${s.symbol}
Page label: ${s.label}

Inspect Google SERPs for these queries:
${queries}

Output JSON with EXACTLY these keys:
{
  "primary_keyword": "single highest-value query",
  "related_long_tail": ["8-12 related searches buyers actually type"],
  "paa_questions": ["6-10 People Also Ask questions — verbatim if visible"],
  "top_serp_titles": ["title tags of top 10 organic results — verbatim"],
  "recommended_h2s": ["5-7 H2 section headings as short noun phrases"],
  "content_gaps": ["3-5 concrete subtopics the top-10 misses or treats shallowly"],
  "grounding_score": 0
}

grounding_score scale:
  0-3 = SERPs are spam / Etsy-only / no editorial. Skip.
  4-6 = mixed; some real mythology content, mostly thin product pages.
  7-10 = clear, multiple ranking pages with real depth.

No commentary, no fences.
`.trim();
}

async function generateBrief(s: SymbolTier3Config): Promise<Brief> {
  enforceCap(BUDGET_CAP_USD);
  const result = await gemini(briefPrompt(s), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const st = addUsage(result.promptTokens, result.outputTokens);
  console.log(
    `    gemini tokens: in=${result.promptTokens} out=${result.outputTokens} (cumulative $${st.costUsd.toFixed(3)})`,
  );
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${s.slug}:\n${raw.slice(0, 400)}`);
  }
}

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans in sterling silver and oxidized bronze since 1974.
Voice: intentional, slightly poetic, sincere, grounded. Like someone who
has read Mary Oliver and actually watched the bird at the window.

For symbolism pages: you are explaining what this symbol carries — across
mythology, folk tradition, and personal meaning — and what it tends to feel
like as worn jewelry. You are NOT writing a Pinterest roundup. You are
writing for the person who is choosing whether this symbol speaks to them.

Hard rules — deal-breakers:
- NEVER use: "perfect gift", "must-have", "trendy", "stunning", "gorgeous",
  "absolutely love", "wow factor", "loved one", "she'll love it",
  "manifest your", "boss babe", "spirit animal" (use "totem" or just
  "the symbol" instead), "good vibes only", "level up".
- No exclamation points. No emojis. No clickbait.
- No "shop now" or sales CTAs in body.
- Don't promise specifications (weights, sizes, finishes, stock).
- US English. Vary sentence length. Short paragraphs.
- Acknowledge the cultural origin of the symbol with specificity and
  respect. If the symbol has been culturally misappropriated, mention
  briefly and accurately.
- For symbols from living spiritual traditions (e.g. scarab, dragon in
  Chinese tradition), reference the source culture by name.
- Don't pad. If a mythology paragraph is repeating, cut it.
- Cite no sources.

Cover the recommended H2s. Answer the PAA questions in the FAQ. Address
content gaps. Output ONLY valid JSON.
`.trim();

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

function writerPrompt(s: SymbolTier3Config, brief: Brief): string {
  return `
Write the Symbolism page for: ${s.label}
Slug: ${s.slug}
Symbol: ${s.symbol}
Primary query: ${s.primaryQuery}

SERP BRIEF (cover the H2s, answer PAA in FAQ, address gaps):
${JSON.stringify(brief, null, 2)}

Schema (return JSON with EXACTLY these keys):
{
  "slug": "${s.slug}",
  "seo_title": "string — max 60 chars, includes '${s.symbol}' and 'jewelry' or 'meaning'",
  "meta_description": "string — max 155 chars, evocative + concrete, no trailing ellipsis, no exclamation",
  "intro": "string — 1-2 short paragraphs (~80-120 words). What the symbol carries, in one breath. No H2 prefix.",
  "meaning": "string — 3-4 paragraphs (~250-350 words) titled 'What the ${s.symbol} means'. Across mythology, folk tradition, and any contested or modern interpretations. Reference specific cultures by name. If the symbol has multiple traditions (Norse, Celtic, Egyptian, Indigenous, etc.), give each its short turn. If the symbol's meaning shifts in different contexts, acknowledge that.",
  "in_jewelry": "string — 1-2 paragraphs (~140-180 words) titled 'The ${s.symbol} in jewelry'. How the symbol typically shows up as a worn piece — pendant, ring, earring, etc. Common stylistic choices (realistic vs stylized, with/without companions, etc). Brief note on how sterling silver or oxidized bronze suits the symbol.",
  "how_to_wear": "string — 1-2 paragraphs (~120-160 words) titled 'How to wear it'. Who tends to choose this symbol; daily wear vs occasion; chain length and visibility; whether to combine with other symbols.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries total, drawn from the brief's paa_questions
  ]
}

Word counts are targets. Don't pad. Don't keyword-stuff. Output JSON only.
`.trim();
}

async function generateCopy(s: SymbolTier3Config, brief: Brief): Promise<SymbolContent> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: WRITER_SYSTEM },
        { role: 'user', content: writerPrompt(s, brief) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.55,
      max_tokens: 3500,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as SymbolContent;
  if (!parsed.slug) parsed.slug = s.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

async function processSymbol(s: SymbolTier3Config) {
  console.log(`\n[${s.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(s);
  fs.writeFileSync(
    path.join(OUT_DIR, `${s.slug}.brief.json`),
    JSON.stringify(brief, null, 2) + '\n',
  );
  console.log(
    `    brief saved (paa=${brief.paa_questions?.length ?? 0}, h2s=${brief.recommended_h2s?.length ?? 0}, grounding=${brief.grounding_score})`,
  );

  if ((brief.grounding_score ?? 0) < GROUNDING_FLOOR) {
    console.log(`    SKIP — grounding_score ${brief.grounding_score} < ${GROUNDING_FLOOR}`);
    return;
  }

  console.log('  · Stage 2 — DeepSeek writes copy...');
  const content = await generateCopy(s, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${s.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/symbols-tier3/${s.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? SYMBOLS_TIER3.filter((s) => args.includes(s.slug)) : SYMBOLS_TIER3;
  if (targets.length === 0) {
    console.error('No matching slugs.');
    process.exit(1);
  }
  console.log(`Generating ${targets.length} symbol page(s)...`);
  for (const s of targets) {
    try {
      await processSymbol(s);
    } catch (err) {
      console.error(`[${s.slug}] ✗ ${(err as Error).message}`);
    }
  }
  const final = getState();
  console.log(
    `\n[budget] $${final.costUsd.toFixed(3)} | ${final.calls} calls | in=${final.promptTokens} out=${final.outputTokens}`,
  );
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
