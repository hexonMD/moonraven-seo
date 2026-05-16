#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Material / Finish / Technique pages (Tier 3).
 *
 * Schema matches Tier 1 materials pages: intro / properties / care /
 * who_chooses / faq, plus seo_title and meta_description.
 *
 * Output: src/content/materials-tier3/<slug>.json + brief.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { MATERIALS_TIER3, type MaterialTier3Config } from '../src/lib/materials-tier3-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';
import { addUsage, enforceCap, getState } from './lib-budget.js';

const BUDGET_CAP_USD = Number(process.env.GEMINI_BUDGET_CAP_USD ?? 10);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'materials-tier3');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Tier 3 material pages need higher grounding floor — these are lower-volume
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
You are an SEO research analyst preparing a brief for a metalwork / material
/ technique explanation page. The destination is a handcrafted jeweler —
Moon Raven Designs. The page should answer "what is this material/finish/
technique, how is it made, what does it look and feel like, how do you care
for it" at the editorial intersection of craft education and buyer guidance.

You have google_search grounding — use it on the actual queries. Don't
hallucinate SERPs. If the SERP is dominated by thin product pages with no
real craft education, say so via grounding_score.

Output ONLY a JSON object — no fences, no commentary.
`.trim();

function briefPrompt(m: MaterialTier3Config): string {
  const queries = [m.primaryQuery, ...m.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Material / finish / technique: ${m.material}
Page label: ${m.label}

Inspect Google SERPs for these queries:
${queries}

Output JSON with EXACTLY these keys:
{
  "primary_keyword": "single highest-value query",
  "related_long_tail": ["8-12 related searches"],
  "paa_questions": ["6-10 People Also Ask questions — verbatim if visible"],
  "top_serp_titles": ["title tags of top 10 organic results"],
  "recommended_h2s": ["5-7 H2 section headings as short noun phrases"],
  "content_gaps": ["3-5 concrete subtopics the top-10 misses or treats shallowly"],
  "grounding_score": 0
}

grounding_score scale:
  0-3 = SERPs are spam / no craft content. Skip.
  4-6 = mixed; some real explainer content, mostly thin product pages.
  7-10 = clear, multiple ranking pages with real depth.

No commentary, no fences.
`.trim();
}

async function generateBrief(m: MaterialTier3Config): Promise<Brief> {
  enforceCap(BUDGET_CAP_USD);
  const result = await gemini(briefPrompt(m), {
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
    throw new Error(`Brief JSON parse failed for ${m.slug}:\n${raw.slice(0, 400)}`);
  }
}

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans in sterling silver and oxidized bronze since 1974.
Voice: intentional, sincere, grounded. For craft-explainer pages, you can
be a touch more technical — the reader is choosing whether to invest in
this material/finish, so be honest about its properties.

Hard rules — deal-breakers:
- NEVER use: "perfect", "must-have", "trendy", "stunning", "gorgeous",
  "absolutely love", "wow factor", "loved one", "level up",
  "you deserve", "best in class".
- No exclamation points. No emojis. No clickbait.
- No "shop now" or sales CTAs in body.
- Be specific where possible: alloy percentages, common composition,
  weight comparison, hypoallergenic notes, care precautions.
- Don't overpromise. Don't claim Moon Raven uses a material or technique
  unless the config asks for it.
- If the material has ethical / sustainability dimensions (recycled
  silver, conflict-free etc.), give them a real paragraph, not a slogan.
- US English. Vary sentence length. Short paragraphs.
- Cite no sources.

Cover the recommended H2s. Answer PAA in FAQ. Address gaps. Output ONLY
valid JSON.
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

function writerPrompt(m: MaterialTier3Config, brief: Brief): string {
  return `
Write the Material page for: ${m.label}
Slug: ${m.slug}
Material / finish / technique: ${m.material}
Primary query: ${m.primaryQuery}

SERP BRIEF (cover the H2s, answer PAA in FAQ, address gaps):
${JSON.stringify(brief, null, 2)}

Schema (return JSON with EXACTLY these keys):
{
  "slug": "${m.slug}",
  "seo_title": "string — max 60 chars, includes the material/technique noun and 'jewelry'",
  "meta_description": "string — max 155 chars, evocative + concrete, no trailing ellipsis, no exclamation",
  "intro": "string — 1-2 short paragraphs (~80-120 words). What the material/finish/technique is, in one breath. No H2 prefix.",
  "properties": "string — 3-4 paragraphs (~250-350 words) titled 'About ${m.material}'. Composition / process / how it is made. Visual and tactile qualities. How it ages. Hypoallergenic / sensitivity notes if applicable. Comparison with other related materials where useful. Be specific. If the page is process-focused (lost wax, mokume gane, hand-forged), walk the reader through the actual steps in plain language.",
  "care": "string — 1-2 paragraphs (~120-160 words) titled 'Care'. How to clean. What to avoid (chlorine, salt water, household cleaners, lotions). When to bring it to a jeweler. If the material is meant to age (antique finish, oxidized), say so explicitly so the buyer doesn't try to polish away an intentional patina.",
  "who_chooses": "string — 1-2 paragraphs (~120-160 words) titled 'Who chooses this'. The buyer this material/finish/technique tends to suit. Concrete archetype, not horoscope.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries total, drawn from the brief's paa_questions
  ]
}

Word counts are targets. Don't pad. Don't keyword-stuff. Output JSON only.
`.trim();
}

async function generateCopy(m: MaterialTier3Config, brief: Brief): Promise<MaterialContent> {
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
      temperature: 0.5,
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as MaterialContent;
  if (!parsed.slug) parsed.slug = m.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

async function processMaterial(m: MaterialTier3Config) {
  console.log(`\n[${m.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(m);
  fs.writeFileSync(
    path.join(OUT_DIR, `${m.slug}.brief.json`),
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
  const content = await generateCopy(m, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${m.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/materials-tier3/${m.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? MATERIALS_TIER3.filter((m) => args.includes(m.slug)) : MATERIALS_TIER3;
  if (targets.length === 0) {
    console.error('No matching slugs.');
    process.exit(1);
  }
  console.log(`Generating ${targets.length} material page(s)...`);
  for (const m of targets) {
    try {
      await processMaterial(m);
    } catch (err) {
      console.error(`[${m.slug}] ✗ ${(err as Error).message}`);
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
