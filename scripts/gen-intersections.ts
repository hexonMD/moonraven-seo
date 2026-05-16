#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Symbol × Material intersection pages (Tier 2).
 *
 *  Output: src/content/intersections/<slug>.json + <slug>.brief.json
 *
 *  Usage:
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-intersections.ts
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-intersections.ts sterling-silver-raven-jewelry
 */

import fs from 'node:fs';
import path from 'node:path';
import { INTERSECTIONS, type IntersectionConfig } from '../src/lib/intersections-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'intersections');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Stage 1 ────────────────────────────────────────────────────────────────

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
You are an SEO research analyst preparing a brief for an
intersection page: a specific material (sterling silver, bronze,
oxidized bronze) crossed with a specific symbol (raven, skull, wolf,
snake, antler, feather, etc).

These pages target unusually high-intent buyers — they already know the
symbol AND the metal. The brief should reflect that.

You have google_search grounding — use it. Output ONLY JSON.
`.trim();

function briefPrompt(i: IntersectionConfig): string {
  const queries = [i.primaryQuery, ...i.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Intersection: ${i.material} × ${i.symbol}
Page label: ${i.label}

Inspect Google SERPs for these queries:
${queries}

Output JSON (no fences, no commentary):
{
  "primary_keyword": "highest-value commercial query",
  "related_long_tail": ["8-12 related searches"],
  "paa_questions": ["6-10 People Also Ask questions"],
  "top_serp_titles": ["title tags of top 10 organic results"],
  "recommended_h2s": ["5-7 H2 section headings the page should cover, as noun phrases"],
  "content_gaps": ["3-5 concrete subtopics the top-10 misses or treats shallowly"],
  "grounding_score": 0
}

grounding_score scale:
  0-3 = SERP is spam / dropshippers / no editorial. Skip.
  4-6 = mixed — some real content, mostly thin product pages.
  7-10 = clear, multiple ranking pages with real depth.
`.trim();
}

async function generateBrief(i: IntersectionConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(i), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${i.slug}:\n${raw.slice(0, 400)}`);
  }
}

// ─── Stage 2 ────────────────────────────────────────────────────────────────

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted pieces in sterling silver and oxidized bronze since 1974.
Voice: intentional, slightly poetic, sincere. Mary Oliver meets a
metalsmith's bench.

For intersection pages: the buyer knows the symbol and the metal they want.
Your job is to help them feel like they picked the right pairing — not
to teach them what bronze is from scratch. Brief practical facts; mostly
talk about what this specific symbol carries in this specific metal.

Hard rules — deal-breakers:
- NEVER use: "perfect gift", "must-have", "trendy", "stunning", "gorgeous",
  "absolutely love", "show off", "wow factor", "loved one", "she'll love it".
- No exclamation points. No emojis. No clickbait.
- No "shop now" or sales CTAs in body.
- Don't promise weights, sizes, finishes, stock.
- US English. Vary sentence length. Short paragraphs.
- Be specific where possible: "925 sterling silver is 92.5% silver, 7.5%
  copper or other alloy"; "solid bronze is heavier than silver, warmer in
  tone". Don't oversell.
- Acknowledge cultural origin of the symbol with respect.

Cover the recommended H2s. Answer the PAA questions in the FAQ. Address
the content gaps. Output ONLY valid JSON.
`.trim();

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

function writerPrompt(i: IntersectionConfig, brief: Brief): string {
  return `
Intersection: ${i.material} × ${i.symbol}
Slug: ${i.slug}

SERP BRIEF:
${JSON.stringify(brief, null, 2)}

Schema (return JSON with EXACTLY these keys):
{
  "slug": "${i.slug}",
  "seo_title": "string — max 65 chars, includes '${i.material}' and '${i.symbol}' and 'jewelry'",
  "meta_description": "string — max 155 chars, evocative + concrete",
  "intro": "string — 2 short paragraphs (~80-100 words). Why this pairing exists, what kind of buyer it suits. No H2 prefix.",
  "why_this_pairing": "string — 2 paragraphs (~140-180 words) titled 'Why ${i.material} for the ${i.symbol}'. The aesthetic and symbolic logic of putting this symbol in this metal. Be specific — color, weight, patina behavior, the way the symbol reads in this material.",
  "about_the_material": "string — 1-2 paragraphs (~100-130 words) titled 'About the ${i.material}'. Quick practical facts: composition, weight, hypoallergenic notes, how it ages. Link mentally to the existing Materials Hub.",
  "about_the_symbol": "string — 1-2 paragraphs (~130-160 words) titled 'About the ${i.symbol}'. Cultural / symbolic meaning in 1-2 traditions. If the symbol is contested, acknowledge briefly. Link mentally to the existing Symbolism Hub.",
  "how_to_wear": "string — 1-2 paragraphs (~90-120 words) titled 'How to wear it'. Daily vs occasion; chain length; layering; whether to mix metals.",
  "care": "string — 1 paragraph (~70-100 words) titled 'Care'. How to clean ${i.material}; what to avoid (chlorine, salt water, household cleaners); when to bring it to a jeweler.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries drawn from the brief's paa_questions
  ]
}

Output JSON only.
`.trim();
}

async function generateCopy(i: IntersectionConfig, brief: Brief): Promise<IntersectionContent> {
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
        { role: 'user', content: writerPrompt(i, brief) },
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as IntersectionContent;
  if (!parsed.slug) parsed.slug = i.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

async function processIntersection(i: IntersectionConfig) {
  console.log(`\n[${i.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(i);
  fs.writeFileSync(
    path.join(OUT_DIR, `${i.slug}.brief.json`),
    JSON.stringify(brief, null, 2) + '\n',
  );
  console.log(
    `    brief saved (paa=${brief.paa_questions?.length ?? 0}, h2s=${brief.recommended_h2s?.length ?? 0}, grounding=${brief.grounding_score})`,
  );

  if ((brief.grounding_score ?? 0) < 4) {
    console.log(`    SKIP — grounding_score ${brief.grounding_score} < 4`);
    return;
  }

  console.log('  · Stage 2 — DeepSeek writes copy...');
  const content = await generateCopy(i, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${i.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/intersections/${i.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? INTERSECTIONS.filter((i) => args.includes(i.slug)) : INTERSECTIONS;
  if (targets.length === 0) {
    console.error('No matching slugs. Available:', INTERSECTIONS.map((i) => i.slug).join(', '));
    process.exit(1);
  }
  console.log(`Generating ${targets.length} intersection page(s)...`);
  for (const i of targets) {
    try {
      await processIntersection(i);
    } catch (err) {
      console.error(`[${i.slug}] ✗ ${(err as Error).message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
