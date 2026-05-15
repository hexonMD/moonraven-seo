#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for the Symbolism Hub.
 *
 *  Stage 1 — Gemini 2.5 Pro with Google Search grounding produces a SERP-grounded
 *            content brief: PAA questions, top-10 H1/H2 patterns, content gaps.
 *  Stage 2 — DeepSeek writes the page from that brief in the Moon Raven voice.
 *
 *  Output: src/content/symbolism/<slug>.json + src/content/symbolism/<slug>.brief.json
 *
 *  Usage:
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-symbolism.ts            # all
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-symbolism.ts raven      # one
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-symbolism.ts raven skull antler
 */

import fs from 'node:fs';
import path from 'node:path';
import { SYMBOLS, type SymbolConfig } from '../src/lib/symbolism-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY) {
  console.error('DEEPSEEK_API_KEY not set');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'symbolism');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Stage 1: Gemini SERP brief ─────────────────────────────────────────────

type Brief = {
  primary_keyword: string;
  related_long_tail: string[];
  paa_questions: string[];
  top_serp_titles: string[];
  recommended_h2s: string[];
  content_gaps: string[];
};

const BRIEF_SYSTEM = `
You are an SEO research analyst. You take a symbol/topic and produce a
SERP-grounded content brief that a writer can use to build a page that
outranks what is currently in Google's top 10 for that symbol's "meaning
in jewelry" queries.

You have google_search grounding enabled — use it to actually look at
SERPs, do not hallucinate.
`.trim();

function briefPrompt(symbol: SymbolConfig): string {
  return `
Symbol: ${symbol.label}
Primary commercial query cluster: "${symbol.label.toLowerCase()} necklace meaning", "${symbol.label.toLowerCase()} jewelry symbolism", "what does a ${symbol.label.toLowerCase()} necklace mean"

Use Google search to inspect the current SERPs for those queries, then output a JSON brief with EXACTLY these keys:

{
  "primary_keyword": "the single highest-value query for this page",
  "related_long_tail": ["8-12 related searches that buyers actually type"],
  "paa_questions": ["6-10 People Also Ask questions that appear in the SERP — verbatim if you can see them"],
  "top_serp_titles": ["the title tags of the top 10 organic results — verbatim"],
  "recommended_h2s": ["5-7 H2 section headings the page should cover, ordered. Each as a short noun phrase, not a question."],
  "content_gaps": ["3-5 specific subtopics, angles, or facts that the top-ranking pages miss, mishandle, or treat shallowly. Be concrete."]
}

Output ONLY the JSON object. No fences, no commentary.
`.trim();
}

async function generateBrief(symbol: SymbolConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(symbol), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${symbol.slug}. First 400 chars:\n${raw.slice(0, 400)}`);
  }
}

// ─── Stage 2: DeepSeek page copy ────────────────────────────────────────────

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making handcrafted talismans in sterling silver and oxidized bronze since 1974. The brand voice is intentional, slightly poetic, dark-but-not-edgelord, sincere. You write like someone who has read Mary Oliver and watched ravens at a window.

Hard rules:
- No "loved one" cliches. No "celebrate their memory." No "perfect gift." No "must-have." No "trendy."
- No exclamation points. No emojis. No clickbait questions.
- No "shop now" or sales-y CTAs in body text.
- Don't promise specifications you can't know (don't claim weights, sizes, or specific finishes).
- US English. Vary sentence length.
- Treat the symbol with respect for cultural origin. If a symbol is contested (e.g. Norse runes have been appropriated), acknowledge briefly without lecturing.
- Cite no sources. This is editorial, not academic.

You write copy that is informed by a SERP brief (provided in the user message). Cover the recommended H2 topics. Answer the PAA questions in the FAQ. Address the content gaps. Beat the top-10 by being more specific, more grounded, and better written — not by stuffing keywords.

Output ONLY valid JSON conforming to the requested schema. No prose around the JSON.
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

function writerPrompt(symbol: SymbolConfig, brief: Brief): string {
  return `
Write the Symbolism Hub page for: ${symbol.label} (slug: ${symbol.slug}).

SERP BRIEF (use this to shape content):
${JSON.stringify(brief, null, 2)}

Schema (return JSON with exactly these keys):
{
  "slug": "${symbol.slug}",
  "seo_title": "string — max 65 chars, includes ${symbol.label} and \\"jewelry\\"",
  "meta_description": "string — max 155 chars, evocative and concrete, no trailing ellipsis",
  "intro": "string — 2 short paragraphs (~80 words total) introducing the symbol's resonance. No header.",
  "meaning": "string — 2-3 paragraphs on cultural/historical/symbolic meaning. Acknowledge multiple traditions where the SERP brief mentions them. ~150-200 words.",
  "in_jewelry": "string — 1-2 paragraphs on how the symbol appears in talismanic jewelry and what it carries when worn. Reference materials (sterling silver, oxidized bronze) generically. ~100-130 words.",
  "how_to_wear": "string — 1-2 paragraphs on who chooses this symbol and when. Concrete, not horoscope-vague. ~80-110 words.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 4-6 entries total, drawn from the PAA questions in the brief
  ]
}

The FAQ entries should map to (or rephrase for clarity) the brief's paa_questions. Cover at least 4 of them. Answer concretely.

Output JSON only.
`.trim();
}

async function generateCopy(symbol: SymbolConfig, brief: Brief): Promise<SymbolContent> {
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
        { role: 'user', content: writerPrompt(symbol, brief) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 2800,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as SymbolContent;
  if (!parsed.slug) parsed.slug = symbol.slug;
  if (json.usage) {
    console.log(
      `    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`,
    );
  }
  return parsed;
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function processSymbol(symbol: SymbolConfig) {
  console.log(`\n[${symbol.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(symbol);
  fs.writeFileSync(
    path.join(OUT_DIR, `${symbol.slug}.brief.json`),
    JSON.stringify(brief, null, 2) + '\n',
  );
  console.log(`    brief saved (paa=${brief.paa_questions.length}, h2s=${brief.recommended_h2s.length})`);

  console.log('  · Stage 2 — DeepSeek writes copy...');
  const content = await generateCopy(symbol, brief);
  fs.writeFileSync(
    path.join(OUT_DIR, `${symbol.slug}.json`),
    JSON.stringify(content, null, 2) + '\n',
  );
  console.log(`    content saved → src/content/symbolism/${symbol.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? SYMBOLS.filter((s) => args.includes(s.slug)) : SYMBOLS;
  if (targets.length === 0) {
    console.error('No matching symbols. Available:', SYMBOLS.map((s) => s.slug).join(', '));
    process.exit(1);
  }
  console.log(`Generating ${targets.length} symbol page(s)...`);
  for (const symbol of targets) {
    try {
      await processSymbol(symbol);
    } catch (err) {
      console.error(`[${symbol.slug}] ✗ ${(err as Error).message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
