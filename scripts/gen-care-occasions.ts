#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Care Occasion pages (Tier 3).
 *
 *  Output: src/content/care-occasions/<slug>.json + brief.json
 *
 *  Usage:
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-care-occasions.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { CARE_OCCASIONS, type CareOccasionConfig } from '../src/lib/care-occasions-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';
import { addUsage, enforceCap, getState } from './lib-budget.js';

const BUDGET_CAP_USD = Number(process.env.GEMINI_BUDGET_CAP_USD ?? 10);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'care-occasions');
fs.mkdirSync(OUT_DIR, { recursive: true });

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
You are an SEO research analyst preparing a brief for a meaningful-jewelry
page tied to a specific life occasion — grief, milestone, transition, or
celebration.

The destination is a handcrafted jeweler — Moon Raven Designs. The eventual
page voice is quiet, sincere, never sales-y. Your brief should reflect that:
flag SERP filler ("celebrate", "warrior", "perfect gift", "fresh start"
content) as a *content gap* — those are pages the eventual writer needs to
beat by being more grounded, not by imitating.

You have google_search grounding — use it. Output ONLY JSON.
`.trim();

function briefPrompt(o: CareOccasionConfig): string {
  const queries = [o.primaryQuery, ...o.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Occasion: ${o.label}
Kind: ${o.kind} (grief / milestone / transition / celebration)
Context: ${o.context}

Inspect Google SERPs for these queries:
${queries}

Output JSON (no fences, no commentary):
{
  "primary_keyword": "highest-value commercial / emotional-intent query",
  "related_long_tail": ["8-12 related searches"],
  "paa_questions": ["6-10 People Also Ask questions"],
  "top_serp_titles": ["title tags of top 10 organic results"],
  "recommended_h2s": ["5-7 H2 section headings as noun phrases"],
  "content_gaps": ["3-5 concrete subtopics the top-10 misses, mishandles, or treats with cliche"],
  "grounding_score": 0
}

grounding_score scale:
  0-3 = SERPs are spam / pure roundups. Skip.
  4-6 = mixed.
  7-10 = clear, with multiple thoughtful ranking pages.
`.trim();
}

async function generateBrief(o: CareOccasionConfig): Promise<Brief> {
  enforceCap(BUDGET_CAP_USD);
  const result = await gemini(briefPrompt(o), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const s = addUsage(result.promptTokens, result.outputTokens);
  console.log(
    `    gemini tokens: in=${result.promptTokens} out=${result.outputTokens} (cumulative $${s.costUsd.toFixed(3)})`,
  );
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${o.slug}:\n${raw.slice(0, 400)}`);
  }
}

const WRITER_BASE = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans in sterling silver and oxidized bronze since 1974.
Voice: intentional, slightly poetic, sincere. Quiet and grounded.

Hard rules — deal-breakers:
- NEVER use: "perfect gift", "must-have", "trendy", "stunning", "gorgeous",
  "absolutely love", "show off", "wow factor", "celebrate her journey",
  "celebrate his journey", "girl boss", "boss babe", "manifest your".
- No exclamation points. No emojis. No clickbait. No "shop now".
- Don't promise weights, sizes, finishes, stock.
- US English. Vary sentence length. Short paragraphs.
- Acknowledge the marker is private. The person is not doing it for applause.
- Cite no sources.
`.trim();

const WRITER_GRIEF = `
${WRITER_BASE}

This is a grief-tier page. Additional rules:
- NEVER use: "loved one", "loved ones", "celebrate their memory",
  "celebrate their life", "honor their memory", "remember them always",
  "find closure", "say goodbye", "fur baby", "fur kid", "rainbow bridge",
  "took their last breath", "lost their battle", "passed over",
  "in a better place", "warrior", "fighter" (cancer/illness context).
- Sincere, slightly poetic, grounded.
- Grief is not linear; comfort is not the goal.
- IMPORTANT: even if the page's SEO targets a cliched phrase, the BODY COPY
  must not use that phrase. The slug is for findability; the writing is
  for the person.

Output ONLY valid JSON.
`.trim();

const WRITER_MILESTONE = `
${WRITER_BASE}

This is a milestone page (remission anniversary, etc). Additional rules:
- The person is marking real time accumulated. The piece is a tally mark.
- Acknowledge what they did. Don't congratulate them.
- No "warrior", no "fight" (cancer context).

Output ONLY valid JSON.
`.trim();

const WRITER_TRANSITION = `
${WRITER_BASE}

This is a transition page (retirement, new home, deployment, coming out,
empty nest, get well, postpartum). Additional rules:
- The ground has shifted. The piece is something to hold onto.
- Don't cheerlead. Don't make it inspirational.
- NEVER use: "fresh start" as the central frame, "level up",
  "she'll feel empowered".

Output ONLY valid JSON.
`.trim();

const WRITER_CELEBRATION = `
${WRITER_BASE}

This is a celebration page (new home blessing, adoption day). Additional
rules:
- Real joy is fine. Manufactured joy is not.
- Don't overuse "celebrate" — the word loses meaning when repeated.

Output ONLY valid JSON.
`.trim();

function pickWriterSystem(o: CareOccasionConfig): string {
  if (o.kind === 'grief') return WRITER_GRIEF;
  if (o.kind === 'milestone') return WRITER_MILESTONE;
  if (o.kind === 'celebration') return WRITER_CELEBRATION;
  return WRITER_TRANSITION;
}

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

function givingHeading(kind: CareOccasionConfig['kind']): string {
  if (kind === 'grief') return 'Giving it, or keeping it for yourself';
  if (kind === 'milestone') return 'Marking it';
  if (kind === 'celebration') return 'Giving it, or keeping it for yourself';
  return 'Giving it, or keeping it for yourself';
}

function writerPrompt(o: CareOccasionConfig, brief: Brief): string {
  return `
Occasion: ${o.label}
Slug: ${o.slug}
Kind: ${o.kind}
Context: ${o.context}

SERP BRIEF:
${JSON.stringify(brief, null, 2)}

Schema (return JSON with EXACTLY these keys):
{
  "slug": "${o.slug}",
  "seo_title": "string — max 60 chars, includes 'jewelry' or 'keepsake' and the occasion noun",
  "meta_description": "string — max 155 chars, evocative + concrete, no trailing ellipsis, no exclamation",
  "intro": "string — 2 short paragraphs (~70-100 words). Don't try to fix the reader. Set what the page is for. No H2 prefix.",
  "what_it_marks": "string — 2 paragraphs (~130-180 words) titled 'What the piece marks'. The emotional / symbolic weight of the occasion. Be concrete about the experience. Acknowledge specific things searchers in the brief have asked about.",
  "choosing": "string — 1-2 paragraphs (~110-150 words) titled 'Choosing a piece'. Practical guidance: necklace vs ring; whether to engrave a date; how to think about size. The right piece is the one the wearer reaches for again.",
  "giving_or_keeping": "string — 1-2 paragraphs (~90-130 words) titled '${givingHeading(o.kind)}'. Whether to give or keep. 1-2 short original card lines if giving.",
  "for_whom": "string — 1-2 paragraphs (~80-110 words) titled 'For whom these pieces are made'. Who tends to choose this occasion page. Grounded specifics.",
  "blessing": "string — 1-3 sentences (max ~40 words). A short closing fragment — a blessing, an acknowledgment, a line. Original. No famous quotes.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries drawn from the brief's paa_questions
  ]
}

Output JSON only.
`.trim();
}

async function generateCopy(
  o: CareOccasionConfig,
  brief: Brief,
): Promise<CareOccasionContent> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: pickWriterSystem(o) },
        { role: 'user', content: writerPrompt(o, brief) },
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as CareOccasionContent;
  if (!parsed.slug) parsed.slug = o.slug;
  if (json.usage) {
    console.log(
      `    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`,
    );
  }
  return parsed;
}

async function processCareOccasion(o: CareOccasionConfig) {
  console.log(`\n[${o.slug}] (${o.kind})`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(o);
  fs.writeFileSync(
    path.join(OUT_DIR, `${o.slug}.brief.json`),
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
  const content = await generateCopy(o, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${o.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/care-occasions/${o.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? CARE_OCCASIONS.filter((o) => args.includes(o.slug)) : CARE_OCCASIONS;
  if (targets.length === 0) {
    console.error('No matching slugs.');
    process.exit(1);
  }
  console.log(`Generating ${targets.length} care-occasion page(s)...`);
  for (const o of targets) {
    try {
      await processCareOccasion(o);
    } catch (err) {
      console.error(`[${o.slug}] ✗ ${(err as Error).message}`);
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
