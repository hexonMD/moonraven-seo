#!/usr/bin/env tsx
/**
 * Two-stage pSEO generator for Occasion pages (Tier 2).
 *
 *  Grief, milestone, and transition occasions. The voice is grief-aware
 *  for `kind === 'grief'`, more practical for milestones, gentle for
 *  transitions.
 *
 *  Output: src/content/occasions/<slug>.json + <slug>.brief.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { OCCASIONS, type OccasionConfig } from '../src/lib/occasions-config.js';
import { gemini, stripJsonFences } from './lib-gemini.js';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
if (!DEEPSEEK_KEY || !process.env.GEMINI_API_KEY) {
  console.error('DEEPSEEK_API_KEY and GEMINI_API_KEY required');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'src', 'content', 'occasions');
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
You are an SEO research analyst preparing a brief for a meaningful-jewelry
page tied to a specific life occasion: grief, milestone, or transition.

The destination is a handcrafted jeweler — Moon Raven Designs. The eventual
page voice is quiet, sincere, never sales-y. Your brief should reflect that:
flag SERP filler ("celebrate", "rainbow bridge", "perfect gift" content)
as a *content gap* — those are pages the eventual writer needs to beat
by being more grounded, not by imitating.

You have google_search grounding — use it. Output ONLY JSON.
`.trim();

function briefPrompt(o: OccasionConfig): string {
  const queries = [o.primaryQuery, ...o.relatedQueries].map((q) => `  - "${q}"`).join('\n');
  return `
Occasion: ${o.label}
Kind: ${o.kind} (grief / milestone / transition)
Context: ${o.context}

Inspect Google SERPs for these queries:
${queries}

Output JSON (no fences, no commentary):
{
  "primary_keyword": "highest-value commercial / emotional-intent query",
  "related_long_tail": ["8-12 related searches"],
  "paa_questions": ["6-10 People Also Ask questions — verbatim if visible"],
  "top_serp_titles": ["title tags of top 10 organic results — verbatim"],
  "recommended_h2s": ["5-7 H2 section headings the page should cover (noun phrases)"],
  "content_gaps": ["3-5 concrete subtopics or angles the top-10 misses, mishandles, or treats with cliche"],
  "grounding_score": 0
}

grounding_score:
  0-3 = SERPs are spam / pure roundups / no editorial intent. Skip.
  4-6 = mixed.
  7-10 = clear, with multiple thoughtful ranking pages.
`.trim();
}

async function generateBrief(o: OccasionConfig): Promise<Brief> {
  const result = await gemini(briefPrompt(o), {
    systemInstruction: BRIEF_SYSTEM,
    withGoogleSearch: true,
    temperature: 0.3,
    maxOutputTokens: 4096,
  });
  const raw = stripJsonFences(result.text);
  try {
    return JSON.parse(raw) as Brief;
  } catch {
    throw new Error(`Brief JSON parse failed for ${o.slug}:\n${raw.slice(0, 400)}`);
  }
}

// ─── Stage 2 ────────────────────────────────────────────────────────────────

const WRITER_SYSTEM_GRIEF = `
You write grief-aware copy for Moon Raven Designs — a Vancouver Island
jeweler making handcrafted memorial pieces in sterling silver and
oxidized bronze since 1974.

Hard rules — deal-breakers for grief pages:
- NEVER use these phrases: "loved one", "loved ones", "celebrate their
  memory", "celebrate their life", "honor their memory", "remember them
  always", "perfect gift", "must-have", "trendy", "modern way to grieve",
  "find closure", "say goodbye", "fur baby", "fur kid", "rainbow bridge",
  "took their last breath", "lost their battle", "passed over",
  "in a better place", "warrior", "fighter" (in cancer/illness context).
- No exclamation points. No emojis. No upbeat phrasing. No "shop now".
- Don't promise weights, sizes, capacities, finishes.
- US English. Vary sentence length. Short paragraphs.
- Sincere, slightly poetic, grounded.
- Acknowledge grief is not linear, comfort is not the goal.
- For pregnancy / infant loss: extra care. The grief is real, frequently
  invisible, and often unwitnessed. Don't moralize. Don't try to make
  it OK. Don't assume the reader is the mother — fathers grieve too.
- For pet loss: take it seriously. No bathos. Refer to the animal by
  species when natural (dog, cat, horse), not "fur baby".
- IMPORTANT: even if the page's SEO targets a cliched phrase like
  "rainbow bridge", the BODY COPY must not use that phrase. The slug
  is for findability; the writing is for the person.

Cover the recommended H2s. Answer the PAA questions in the FAQ. Address
the content gaps. Output ONLY valid JSON.
`.trim();

const WRITER_SYSTEM_MILESTONE = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans and meaningful pieces in sterling silver and oxidized
bronze since 1974. Voice: intentional, slightly poetic, sincere.

For milestone pages (graduation, retirement, sobriety, anniversary, cancer
survivor): you're writing for someone marking real time accumulated. The
piece is a tally mark. Don't congratulate them. Acknowledge what they did.

Hard rules:
- NEVER use: "perfect gift", "must-have", "stunning", "absolutely
  beautiful", "celebrate her achievement", "celebrate his journey",
  "warrior" (for cancer), "fight" (for cancer), "show off".
- No exclamation points. No emojis. No clickbait. No "shop now".
- Don't promise weights, sizes, stock.
- US English. Short paragraphs.
- Acknowledge that the marker is private — the person isn't doing it for
  applause.

Output ONLY valid JSON in the requested schema.
`.trim();

const WRITER_SYSTEM_TRANSITION = `
You write copy for Moon Raven Designs — a Vancouver Island jeweler making
handcrafted talismans in sterling silver and oxidized bronze since 1974.
Voice: intentional, slightly poetic, sincere.

For transition pages (divorce, moving, new chapter): you're writing for
someone whose ground has shifted. The piece is something to hold onto.
Don't cheerlead. Don't make it inspirational. The transition is the
point — the future hasn't been earned yet.

Hard rules:
- NEVER use: "fresh start" as the central frame (it's a SEO crutch),
  "perfect gift", "must-have", "she'll feel empowered", "boss babe",
  "girl boss", "level up", "manifest your".
- No exclamation points. No emojis. No clickbait. No "shop now".
- US English. Short paragraphs.

Output ONLY valid JSON.
`.trim();

type OccasionContent = {
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

function writerPrompt(o: OccasionConfig, brief: Brief): string {
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
  "seo_title": "string — max 65 chars, includes 'jewelry' or 'keepsake' and the occasion noun",
  "meta_description": "string — max 155 chars, evocative + concrete, no trailing ellipsis, no exclamation",
  "intro": "string — 2 short paragraphs (~70-100 words). Don't try to fix the reader. Set what the page is for. No H2 prefix.",
  "what_it_marks": "string — 2 paragraphs (~130-180 words) titled 'What the piece marks'. The emotional / symbolic weight of the occasion. Be concrete about the experience. Acknowledge specific things searchers in the brief have asked about.",
  "choosing": "string — 1-2 paragraphs (~110-150 words) titled 'Choosing a piece'. Practical guidance: necklace vs ring; whether to engrave a date; whether to include hair/ash/fur (if grief); how to think about size. Acknowledge that no piece will be exactly right — the right piece is the one the wearer reaches for again.",
  "giving_or_keeping": "string — 1-2 paragraphs (~90-130 words) titled '${o.kind === 'grief' ? 'Giving it, or keeping it for yourself' : o.kind === 'milestone' ? 'Marking it' : 'Giving it, or keeping it for yourself'}'. Whether to give the piece to someone or keep it for self. What to write on a card if giving — 1-2 short original lines.",
  "for_whom": "string — 1-2 paragraphs (~80-110 words) titled 'For whom these pieces are made'. Who tends to choose this occasion page. Grounded specifics.",
  "blessing": "string — 1-3 sentences (max ~40 words). A short closing fragment — a blessing, an acknowledgment, a line. Original. No famous quotes.",
  "faq": [
    { "q": "string", "a": "2-3 sentence answer" },
    ... 6-8 entries drawn from the brief's paa_questions
  ]
}

Output JSON only. No prose around it.
`.trim();
}

function pickWriterSystem(o: OccasionConfig): string {
  if (o.kind === 'grief') return WRITER_SYSTEM_GRIEF;
  if (o.kind === 'milestone') return WRITER_SYSTEM_MILESTONE;
  return WRITER_SYSTEM_TRANSITION;
}

async function generateCopy(o: OccasionConfig, brief: Brief): Promise<OccasionContent> {
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
  const parsed = JSON.parse(json.choices[0]?.message?.content ?? '{}') as OccasionContent;
  if (!parsed.slug) parsed.slug = o.slug;
  if (json.usage) {
    console.log(`    writer tokens: in=${json.usage.prompt_tokens} out=${json.usage.completion_tokens}`);
  }
  return parsed;
}

async function processOccasion(o: OccasionConfig) {
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
  console.log(`    saved → src/content/occasions/${o.slug}.json`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? OCCASIONS.filter((o) => args.includes(o.slug)) : OCCASIONS;
  if (targets.length === 0) {
    console.error('No matching slugs. Available:', OCCASIONS.map((o) => o.slug).join(', '));
    process.exit(1);
  }
  console.log(`Generating ${targets.length} occasion page(s)...`);
  for (const o of targets) {
    try {
      await processOccasion(o);
    } catch (err) {
      console.error(`[${o.slug}] ✗ ${(err as Error).message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
