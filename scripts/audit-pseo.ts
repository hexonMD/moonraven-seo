#!/usr/bin/env tsx
/**
 * Audit all generated pSEO content with Gemini 2.5 Pro.
 *
 * For each symbolism/memorial/material JSON, send Gemini:
 *   - the original SERP brief (if available)
 *   - the generated content
 *   - the brand voice rules
 * and get back a structured critique.
 *
 * Output: docs/audits/moonraven-pseo-audit-<date>.md
 *
 * Uses MARK'S key only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { gemini, stripJsonFences } from './lib-gemini.js';

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY required (must be Mark\'s key)');
  process.exit(1);
}

const REPORT_PATH = path.join(
  process.cwd(),
  '..',
  '..',
  'Campmatch',
  'docs',
  'audits',
  `moonraven-pseo-audit-${new Date().toISOString().slice(0, 10)}.md`,
);

type AuditResult = {
  brand_voice: { score: number; issues: string[] };
  serp_coverage: { score: number; issues: string[] };
  factual_quality: { score: number; issues: string[] };
  seo_hygiene: { score: number; issues: string[] };
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  top_suggestions: string[];
};

const AUDIT_SYSTEM = `
You are auditing pSEO content for Moon Raven Designs — a Vancouver Island jeweler making handcrafted talismans + memorial jewelry since 1974.

Brand voice MUST be: intentional, slightly poetic, sincere, like Mary Oliver + a metalsmith. Never: maudlin, kitsch, salesy, generic SEO-speak.

Hard banned phrases to flag if present: "loved one", "loved ones", "celebrate their memory", "celebrate their life", "honor their memory", "remember them always", "perfect gift", "must-have", "trendy", "modern way to grieve", "find closure", "say goodbye", "fur baby", "rainbow bridge", "took their last breath", any exclamation points, any emojis.

Cultural-respect check: where the symbol has Indigenous, religious, or contested origins (Norse runes, Native American symbols, Celtic symbols, etc.), the content should acknowledge this briefly without lecturing or appropriating.

You will receive a SERP brief + the generated page content + the page's purpose. Return ONLY a JSON audit object.

Score each dimension 1-10 (10 = excellent). Be honest, not generous. A grade of A means "this is the kind of writing that wins niche SEO via quality"; C means "publishable but bland"; D-F means "needs rewrite".
`.trim();

function auditPrompt(slug: string, kind: string, brief: unknown, content: unknown): string {
  return `
Page: ${kind}/${slug}

SERP BRIEF:
${JSON.stringify(brief ?? {}, null, 2).slice(0, 2000)}

GENERATED CONTENT:
${JSON.stringify(content, null, 2).slice(0, 4000)}

Return JSON with this exact schema:
{
  "brand_voice": {
    "score": 1-10,
    "issues": ["specific lines or phrases that violate brand voice; empty array if none"]
  },
  "serp_coverage": {
    "score": 1-10,
    "issues": ["PAA questions or content gaps from the brief that the page misses or handles weakly"]
  },
  "factual_quality": {
    "score": 1-10,
    "issues": ["factual errors, dubious claims, cultural insensitivity, unsupported assertions"]
  },
  "seo_hygiene": {
    "score": 1-10,
    "issues": ["title too long (>65 chars)? meta_description too long (>155)? FAQ count off? missing keyword in title?"]
  },
  "overall_grade": "A|B|C|D|F",
  "top_suggestions": ["3-5 highest-leverage edits if you'd send this back for revision"]
}

Output JSON only.
`.trim();
}

async function auditPage(
  kind: 'symbolism' | 'memorial' | 'materials',
  slug: string,
): Promise<{ slug: string; kind: string; audit: AuditResult } | null> {
  const contentPath = path.join(process.cwd(), 'src', 'content', kind, `${slug}.json`);
  const briefPath = path.join(process.cwd(), 'src', 'content', kind, `${slug}.brief.json`);
  if (!fs.existsSync(contentPath)) {
    console.log(`  ${kind}/${slug}: skip (no content file)`);
    return null;
  }
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const brief = fs.existsSync(briefPath)
    ? JSON.parse(fs.readFileSync(briefPath, 'utf-8'))
    : null;

  try {
    const result = await gemini(auditPrompt(slug, kind, brief, content), {
      systemInstruction: AUDIT_SYSTEM,
      jsonResponse: true,
      model: 'gemini-2.5-pro',
      temperature: 0.2,
      maxOutputTokens: 4096,
    });
    const raw = stripJsonFences(result.text);
    const audit = JSON.parse(raw) as AuditResult;
    console.log(
      `  ${kind}/${slug}: ${audit.overall_grade} (vc=${audit.brand_voice.score} sc=${audit.serp_coverage.score} fc=${audit.factual_quality.score} se=${audit.seo_hygiene.score})`,
    );
    return { slug, kind, audit };
  } catch (err) {
    console.error(`  ${kind}/${slug}: ✗ ${(err as Error).message.slice(0, 200)}`);
    return null;
  }
}

async function main() {
  console.log('Auditing all pSEO content with Gemini 2.5 Pro...\n');

  const kinds: Array<'symbolism' | 'memorial' | 'materials'> = [
    'symbolism',
    'memorial',
    'materials',
  ];
  const all: Array<{ slug: string; kind: string; audit: AuditResult }> = [];

  for (const kind of kinds) {
    console.log(`\n[${kind}]`);
    const dir = path.join(process.cwd(), 'src', 'content', kind);
    if (!fs.existsSync(dir)) continue;
    const slugs = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.endsWith('.brief.json'))
      .map((f) => f.replace(/\.json$/, ''));
    for (const slug of slugs) {
      const r = await auditPage(kind, slug);
      if (r) all.push(r);
    }
  }

  // Aggregate report
  const lines: string[] = [];
  lines.push(`# Moonraven pSEO Audit — Gemini 2.5 Pro`);
  lines.push(``);
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Pages audited:** ${all.length}`);
  lines.push(``);

  // Grade distribution
  const grades = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.audit.overall_grade] = (acc[r.audit.overall_grade] ?? 0) + 1;
    return acc;
  }, {});
  lines.push(`## Grade distribution`);
  for (const g of ['A', 'B', 'C', 'D', 'F']) {
    lines.push(`- **${g}**: ${grades[g] ?? 0}`);
  }
  lines.push(``);

  // Lowest scorers
  const sorted = [...all].sort((a, b) => {
    const av =
      a.audit.brand_voice.score +
      a.audit.serp_coverage.score +
      a.audit.factual_quality.score +
      a.audit.seo_hygiene.score;
    const bv =
      b.audit.brand_voice.score +
      b.audit.serp_coverage.score +
      b.audit.factual_quality.score +
      b.audit.seo_hygiene.score;
    return av - bv;
  });

  lines.push(`## Bottom 10 pages (most-improvement candidates)`);
  lines.push(``);
  for (const r of sorted.slice(0, 10)) {
    const total =
      r.audit.brand_voice.score +
      r.audit.serp_coverage.score +
      r.audit.factual_quality.score +
      r.audit.seo_hygiene.score;
    lines.push(`### ${r.kind}/${r.slug} — Grade ${r.audit.overall_grade} (${total}/40)`);
    lines.push(`- **Brand voice** (${r.audit.brand_voice.score}/10): ${r.audit.brand_voice.issues.join('; ') || 'no issues'}`);
    lines.push(`- **SERP coverage** (${r.audit.serp_coverage.score}/10): ${r.audit.serp_coverage.issues.join('; ') || 'no issues'}`);
    lines.push(`- **Factual quality** (${r.audit.factual_quality.score}/10): ${r.audit.factual_quality.issues.join('; ') || 'no issues'}`);
    lines.push(`- **SEO hygiene** (${r.audit.seo_hygiene.score}/10): ${r.audit.seo_hygiene.issues.join('; ') || 'no issues'}`);
    lines.push(`- **Top suggestions:**`);
    for (const s of r.audit.top_suggestions) {
      lines.push(`  - ${s}`);
    }
    lines.push(``);
  }

  lines.push(`## All pages (alphabetical)`);
  lines.push(``);
  lines.push(`| Page | Grade | Voice | SERP | Facts | SEO | Top issue |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of [...all].sort((a, b) => `${a.kind}/${a.slug}`.localeCompare(`${b.kind}/${b.slug}`))) {
    const topIssue =
      r.audit.brand_voice.issues[0] ??
      r.audit.serp_coverage.issues[0] ??
      r.audit.factual_quality.issues[0] ??
      r.audit.seo_hygiene.issues[0] ??
      '—';
    lines.push(
      `| ${r.kind}/${r.slug} | ${r.audit.overall_grade} | ${r.audit.brand_voice.score} | ${r.audit.serp_coverage.score} | ${r.audit.factual_quality.score} | ${r.audit.seo_hygiene.score} | ${topIssue.slice(0, 80)} |`,
    );
  }
  lines.push(``);

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Audited: ${all.length} pages`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
