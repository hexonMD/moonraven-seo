#!/usr/bin/env tsx
/**
 * Two-stage generator for Memorial Pages by Loss Type.
 *
 *  Stage 1 — Gemini 2.5 Pro w/ Google Search grounding produces a SERP brief
 *            for the loss-type query cluster (e.g. "memorial necklace for loss
 *            of mother"). PAA, top-10 titles, content gaps.
 *  Stage 2 — DeepSeek writes the page in Moon Raven's voice, grief-aware,
 *            no cliches.
 *
 *  Output: src/content/memorial/<slug>.json (+ .brief.json)
 *
 *  Usage:
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-memorial.ts            # all
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-memorial.ts mother    # one
 */

import fs from 'node:fs';
import path from 'node:path';
import { MEMORIALS, type MemorialConfig } from '../src/lib/memorial-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'memorial');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Stage 1: SERP brief ────────────────────────────────────────────────────

type Brief = {
  primary_keyword: string;
  related_long_tail: string[];
  paa_questions: string[];
  top_serp_titles: string[];
  content_gaps: string[];
};

const BRIEF_SYSTEM = `
You are a content strategist preparing a brief for a *grief-aware* commerce page about memorial jewelry / cremation pendants. You have google_search grounding — use it to inspect real SERPs, do not hallucinate.

The tone of the eventual page will be quiet, sincere, and concrete. Avoid grief cliches in your brief content and gaps. Focus on:
- What buyers actually search after a specific loss
- What questions the SERPs answer thinly or with too much "celebrate their memory" filler
- What practical/emotional gaps a well-written page could fill
`.trim();

function briefPrompt(m: MemorialConfig): string {
  return `
Loss type: ${m.label} (${m.griefSubject})

Inspect Google SERPs for queries like:
- "memorial necklace for ${m.griefSubject.replace('loss of a ', '').replace('loss of ', '')}"
- "cremation jewelry for ${m.griefSubject.replace('loss of a ', '').replace('loss of ', '')}"
- "${m.griefSubject} memorial gift"

Output ONLY a JSON object:
{
  "primary_keyword": "highest-value query",
  "related_long_tail": ["6-10 real related searches"],
  "paa_questions": ["6-10 People Also Ask questions from the SERP"],
  "top_serp_titles": ["title tags of top 10 organic results"],
  "content_gaps": ["3-5 things the top results miss, mishandle, or feel hollow about"]
}

No commentary, no fences.
`.trim();
}

async function generateBrief(m: MemorialConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(m), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${m.slug}:\n${raw.slice(0, 400)}`);
  }
}

// ─── Stage 2: page copy ─────────────────────────────────────────────────────

const WRITER_SYSTEM = `
You write grief-aware copy for Moon Raven Designs — a Vancouver Island jeweler making handcrafted memorial pieces and cremation pendants in sterling silver and oxidized bronze since 1974.

Hard rules — these are deal-breakers for this tier:
- NEVER use these phrases: "loved one", "loved ones", "celebrate their memory", "celebrate their life", "honor their memory", "remember them always", "perfect gift", "must-have", "trendy", "modern way to grieve", "find closure", "say goodbye", "fur baby", "rainbow bridge", "took their last breath".
- No exclamation points. No emojis. No upbeat phrasing.
- No "shop now" or sales-y CTAs in body text.
- Don't promise specifications you can't verify (don't claim weights, capacities, finishes).
- US English. Vary sentence length. Short paragraphs.
- Sincere, slightly poetic, grounded. Like someone who has read Mary Oliver, watched ravens, and sat with friends through real loss.
- Acknowledge that grief is not linear, comfort is not the goal, and that wearing a piece of someone is a private act — not a public statement.
- For pet pages: take the loss seriously. No bathos. Refer to the pet by species when natural (dog, cat, horse), not "fur baby" or "fur kid".
- For pregnancy-loss/baby pages: extra care. The grief is real, frequently invisible, and often unwitnessed. Don't moralize. Don't try to make it OK.

You write copy informed by a SERP brief. Cover the gaps. Answer the PAA questions in the FAQ. Don't keyword-stuff — outwriting the top-10 beats outranking them.

Output ONLY valid JSON in the requested schema.
`.trim();

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

function writerPrompt(m: MemorialConfig, brief: Brief): string {
  return `
Write the Memorial page for: ${m.label} (${m.griefSubject}, slug: ${m.slug}).

SERP BRIEF (incorporate the gaps, answer PAA in FAQ):
${JSON.stringify(brief, null, 2)}

Schema (return JSON):
{
  "slug": "${m.slug}",
  "seo_title": "string — max 65 chars",
  "meta_description": "string — max 155 chars, evocative + concrete",
  "intro": "string — 2 short paragraphs (~70-90 words total) that don't try to fix or comfort the reader. Set the page's purpose. No H2 prefix.",
  "choosing": "string — 1-2 paragraphs (~100-130 words) titled 'Choosing the right piece'. Practical guidance: pendant vs ring vs urn pendant; engraving options; how to think about size; whether to include a small amount of ash, fur, hair, or hold a memory only.",
  "what_it_carries": "string — 1-2 paragraphs (~100-130 words) titled 'What the piece holds'. The intent of wearing — daily touchstone vs occasion vs hidden private piece. The texture of carrying someone with you.",
  "for_whom": "string — 1-2 paragraphs (~80-110 words) titled 'For whom these pieces are made'. Who tends to choose this type of memorial piece. Grounded specifics, not horoscope-vague.",
  "blessing": "string — 1-3 sentences. A closing fragment — could be a short blessing, an acknowledgment, a quiet line. Not a quote from a famous person; original. No more than ~40 words.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 4-6 entries drawn from the brief's paa_questions
  ]
}

No prose around the JSON.
`.trim();
}

async function generateCopy(m: MemorialConfig, brief: Brief): Promise<MemorialContent> {
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
      max_tokens: 3200,
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as MemorialContent;
  if (!parsed.slug) parsed.slug = m.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

async function processMemorial(m: MemorialConfig) {
  console.log(`\n[${m.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(m);
  fs.writeFileSync(
    path.join(OUT_DIR, `${m.slug}.brief.json`),
    JSON.stringify(brief, null, 2) + '\n',
  );
  console.log(`    brief saved (paa=${brief.paa_questions?.length ?? 0}, gaps=${brief.content_gaps?.length ?? 0})`);

  console.log('  · Stage 2 — DeepSeek writes copy...');
  const content = await generateCopy(m, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${m.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/memorial/${m.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets =
    args.length > 0 ? MEMORIALS.filter((m) => args.includes(m.slug)) : MEMORIALS;
  if (targets.length === 0) {
    console.error('No matching slugs. Available:', MEMORIALS.map((m) => m.slug).join(', '));
    process.exit(1);
  }
  console.log(`Generating ${targets.length} memorial page(s)...`);
  for (const m of targets) {
    try {
      await processMemorial(m);
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
