#!/usr/bin/env tsx
/**
 * Two-stage generator for Material Guide Hub.
 *
 *  Stage 1 — Gemini SERP brief
 *  Stage 2 — DeepSeek writes a practical, brand-voice material guide
 */

import fs from 'node:fs';
import path from 'node:path';
import { MATERIALS, type MaterialConfig } from '../src/lib/materials-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'materials');
fs.mkdirSync(OUT_DIR, { recursive: true });

type Brief = {
  primary_keyword: string;
  paa_questions: string[];
  top_serp_titles: string[];
  content_gaps: string[];
};

const BRIEF_SYSTEM = `
SERP research analyst. Use google_search to inspect actual SERPs.
Output JSON only, no commentary.
`.trim();

function briefPrompt(m: MaterialConfig): string {
  return `
Material: ${m.label}

Inspect Google for: "${m.label.toLowerCase()} jewelry", "how to care for ${m.label.toLowerCase()} jewelry", "is ${m.label.toLowerCase()} hypoallergenic".

Output JSON:
{
  "primary_keyword": "...",
  "paa_questions": ["6-10 PAA questions"],
  "top_serp_titles": ["top 10 organic result titles"],
  "content_gaps": ["3-5 things top results miss"]
}
`.trim();
}

async function generateBrief(m: MaterialConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(m), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  return JSON.parse(raw) as Brief;
}

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making handcrafted pieces in sterling silver, oxidized bronze, solid bronze, white bronze, and copper since 1974. Brand voice: intentional, slightly poetic, sincere. Like Mary Oliver meets a metalsmith's bench.

For materials pages: be practical AND evocative. A buyer should leave knowing both *why* this metal is interesting (its tradition, its behavior, its feel) AND *how to actually care for it* (cleaning, tarnish, sizing implications, hypoallergenic concerns).

Hard rules:
- No "must-have", "trendy", "perfect gift", exclamation points, emojis.
- No claims about specific Moonraven products' weights or sizes.
- US English. Vary sentence length.
- Be specific where possible (e.g. "925 sterling silver is 92.5% silver, 7.5% other alloyed metals — usually copper").

Output ONLY JSON in the schema.
`.trim();

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

function writerPrompt(m: MaterialConfig, brief: Brief): string {
  return `
Material: ${m.label} (slug: ${m.slug}).

SERP BRIEF:
${JSON.stringify(brief, null, 2)}

Schema:
{
  "slug": "${m.slug}",
  "seo_title": "string max 65 chars",
  "meta_description": "string max 155 chars",
  "intro": "2 short paragraphs (~80 words) — what this material is, why we work in it.",
  "properties": "1-2 paragraphs (~150 words) — physical properties, alloy composition if known, weight feel, tarnish behavior, hypoallergenic concerns, durability.",
  "care": "1-2 paragraphs (~150 words) — how to clean, what to avoid (chlorine, salt water, household cleaners), how to refresh patina, when to bring it to a jeweler.",
  "who_chooses": "1 paragraph (~80-110 words) — who tends to choose this material, what kinds of pieces it suits, what intent it carries.",
  "faq": [
    { "q": "...", "a": "2-3 sentence answer" },
    ... 4-6 entries from the brief's paa_questions
  ]
}
`.trim();
}

async function generateCopy(m: MaterialConfig, brief: Brief): Promise<MaterialContent> {
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
        { role: 'user', content: writerPrompt(m, brief) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.55,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as MaterialContent;
  if (!parsed.slug) parsed.slug = m.slug;
  return parsed;
}

async function processMaterial(m: MaterialConfig) {
  console.log(`\n[${m.slug}]`);
  console.log('  · Gemini SERP brief...');
  const brief = await generateBrief(m);
  fs.writeFileSync(
    path.join(OUT_DIR, `${m.slug}.brief.json`),
    JSON.stringify(brief, null, 2) + '\n',
  );
  console.log('  · DeepSeek copy...');
  const content = await generateCopy(m, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${m.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/materials/${m.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? MATERIALS.filter((m) => args.includes(m.slug)) : MATERIALS;
  console.log(`Generating ${targets.length} material page(s)...`);
  for (const m of targets) {
    try {
      await processMaterial(m);
    } catch (err) {
      console.error(`[${m.slug}] ✗ ${(err as Error).message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
