#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Gift Guide pages (Tier 2).
 *
 *  Stage 1 — Gemini 2.5 Pro with Google Search grounding produces a
 *            SERP-grounded brief for the gift query cluster.
 *  Stage 2 — DeepSeek writes the page in Moon Raven voice.
 *
 *  Output: src/content/gift-guides/<slug>.json + <slug>.brief.json
 *
 *  Usage:
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-gift-guides.ts
 *    GEMINI_API_KEY=... DEEPSEEK_API_KEY=... npx tsx scripts/gen-gift-guides.ts gift-mom-raven
 */

import fs from 'node:fs';
import path from 'node:path';
import { GIFT_GUIDES, type GiftGuideConfig } from '../src/lib/gift-guides-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'gift-guides');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Stage 1: Gemini SERP brief ─────────────────────────────────────────────

type Brief = {
  primary_keyword: string;
  related_long_tail: string[];
  paa_questions: string[];
  top_serp_titles: string[];
  recommended_h2s: string[];
  content_gaps: string[];
  // 0-10 self-scored grounding signal — how well the SERP gives us real
  // commercial-intent material to work with. < 4 means skip the page.
  grounding_score: number;
};

const BRIEF_SYSTEM = `
You are an SEO research analyst preparing a brief for a gift-guide commerce
page. The destination is a handcrafted jeweler — Moon Raven Designs — so
"gift" here means a single thoughtful piece of meaningful jewelry, not a
roundup of 50 bath products.

You have google_search grounding — use it on the actual queries provided.
Don't hallucinate SERPs. If the SERP is dominated by Etsy roundups and
Pinterest boards rather than real editorial, say so via grounding_score.

Output ONLY a JSON object — no fences, no commentary.
`.trim();

function briefPrompt(g: GiftGuideConfig): string {
  const queries = [g.primaryQuery, ...g.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Gift guide: ${g.label}
Recipient: ${g.recipient}
Emotional / symbolic anchor: ${g.anchor}

Inspect Google SERPs for these queries:
${queries}

Output JSON with EXACTLY these keys:
{
  "primary_keyword": "single highest-value commercial query",
  "related_long_tail": ["8-12 related searches buyers actually type"],
  "paa_questions": ["6-10 People Also Ask questions — verbatim if you can see them"],
  "top_serp_titles": ["title tags of top 10 organic results — verbatim"],
  "recommended_h2s": ["5-7 H2 section headings the page should cover, as short noun phrases (not questions)"],
  "content_gaps": ["3-5 concrete subtopics or angles the top-10 misses, mishandles, or treats shallowly"],
  "grounding_score": 0
}

grounding_score scale:
  0-3 = SERPs are spam / Etsy-only / no real commercial intent. Skip.
  4-6 = mixed; some real editorial, some thin lists.
  7-10 = clear buyer intent, multiple ranking pages with real depth.

No commentary, no fences.
`.trim();
}

async function generateBrief(g: GiftGuideConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(g), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${g.slug}. First 400 chars:\n${raw.slice(0, 400)}`);
  }
}

// ─── Stage 2: DeepSeek page copy ────────────────────────────────────────────

const WRITER_SYSTEM = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans in sterling silver and oxidized bronze since 1974.
Brand voice: intentional, slightly poetic, quiet, sincere. Like Mary
Oliver met a metalsmith.

For gift-guide pages: the page exists because someone is choosing a
specific meaningful piece for a specific person. Your job is to help
them choose well — not to upsell, not to make them feel rushed, not to
flatter them for being thoughtful. Be a friend at the jeweler's bench.

Hard rules — these are deal-breakers:
- NEVER use: "perfect gift", "must-have", "trendy", "loved one", "she'll love",
  "he'll love", "celebrate their", "show her you care", "show him you care",
  "say it all", "stunning", "gorgeous", "stunning piece", "absolutely love",
  "wow factor".
- No exclamation points. No emojis. No clickbait questions.
- No "shop now" or sales CTAs inside body text.
- Don't promise weights, sizes, finishes, or stock you can't verify.
- US English. Vary sentence length. Short paragraphs.
- If the gift is for a grieving person (memorial, sympathy, pet loss), apply
  the memorial-tier voice: no platitudes, no "find closure", no "fur baby",
  no "rainbow bridge", no "celebrate their memory".
- If the recipient is a child/teen, still write for the adult buyer.
- Reference materials (sterling silver, oxidized bronze) only generically.
- Cite no sources.

You're writing copy informed by a SERP brief. Cover the recommended H2s.
Answer the PAA questions in the FAQ. Address the content gaps. Beat the
top-10 by being more specific and better written, not by stuffing
keywords.

Output ONLY valid JSON in the requested schema.
`.trim();

type GiftGuideContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  why_this_symbol: string;
  how_to_choose: string;
  presentation: string;
  for_whom: string;
  faq: Array<{ q: string; a: string }>;
};

function writerPrompt(g: GiftGuideConfig, brief: Brief): string {
  return `
Write the Gift Guide page for: ${g.label}
Slug: ${g.slug}
Recipient: ${g.recipient}
Emotional / symbolic anchor: ${g.anchor}
Primary query: ${g.primaryQuery}

SERP BRIEF (use this — cover the H2s, answer PAA in FAQ, address gaps):
${JSON.stringify(brief, null, 2)}

Schema (return JSON with EXACTLY these keys):
{
  "slug": "${g.slug}",
  "seo_title": "string — max 65 chars, includes the recipient term and either 'jewelry' or 'gift'",
  "meta_description": "string — max 155 chars, evocative + concrete, no trailing ellipsis, no exclamation",
  "intro": "string — 2 short paragraphs (~80-110 words total) — frame why someone is on this page and what the next ten minutes of reading is for. No H2 prefix.",
  "why_this_symbol": "string — 2-3 paragraphs (~150-200 words) titled 'Why this symbol for this person'. Explain why the anchor symbol/material/occasion suits the recipient. Be concrete, not horoscope-vague. If grief-related, name the loss directly.",
  "how_to_choose": "string — 2 paragraphs (~130-180 words) titled 'How to choose the right piece'. Practical guidance: necklace vs ring vs earring; chain length; whether to engrave; how much weight is right; whether it should be visible or hidden. Acknowledge that the right piece is the one the recipient would actually wear.",
  "presentation": "string — 1-2 paragraphs (~90-130 words) titled 'On giving it'. How to present the piece. What to write in the card (1-2 sample lines — short, original, not Hallmark). Whether to give it in person or by mail. Whether to explain the symbolism or let her find it.",
  "for_whom": "string — 1-2 paragraphs (~80-110 words) titled 'For whom these gifts are made'. Who tends to choose this particular guide. Grounded specifics.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries total, drawn from the brief's paa_questions
  ]
}

Word counts are targets. Don't pad. Don't keyword-stuff. Output JSON only.
`.trim();
}

async function generateCopy(g: GiftGuideConfig, brief: Brief): Promise<GiftGuideContent> {
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
        { role: 'user', content: writerPrompt(g, brief) },
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as GiftGuideContent;
  if (!parsed.slug) parsed.slug = g.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function processGiftGuide(g: GiftGuideConfig) {
  console.log(`\n[${g.slug}]`);
  console.log('  · Stage 1 — Gemini SERP brief...');
  const brief = await generateBrief(g);
  fs.writeFileSync(
    path.join(OUT_DIR, `${g.slug}.brief.json`),
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
  const content = await generateCopy(g, brief);
  fs.writeFileSync(path.join(OUT_DIR, `${g.slug}.json`), JSON.stringify(content, null, 2) + '\n');
  console.log(`    saved → src/content/gift-guides/${g.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? GIFT_GUIDES.filter((g) => args.includes(g.slug)) : GIFT_GUIDES;
  if (targets.length === 0) {
    console.error('No matching slugs. Available:', GIFT_GUIDES.map((g) => g.slug).join(', '));
    process.exit(1);
  }
  console.log(`Generating ${targets.length} gift-guide page(s)...`);
  for (const g of targets) {
    try {
      await processGiftGuide(g);
    } catch (err) {
      console.error(`[${g.slug}] ✗ ${(err as Error).message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
