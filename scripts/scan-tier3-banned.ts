#!/usr/bin/env tsx
/**
 * Banned-phrase scanner for Tier 3 pSEO content.
 *
 * Walks src/content/{holidays,gift-recipients-tier3,care-occasions,
 * symbols-tier3,materials-tier3}/*.json (excluding *.brief.json) and reports
 * any banned phrase in the body fields. faq.a is scanned. seo_title and
 * meta_description are scanned. faq.q (the question text) is exempt because
 * the model is mirroring real-search PAA — some PAA legitimately quote a
 * banned phrase ("rainbow bridge", "loved one") and the page exists to
 * provide a better answer than the SERP.
 *
 * Usage:
 *   npx tsx scripts/scan-tier3-banned.ts
 *   npx tsx scripts/scan-tier3-banned.ts --fail   # exit 1 on hit
 */

import fs from 'node:fs';
import path from 'node:path';

const BUCKETS = [
  'holidays',
  'gift-recipients-tier3',
  'care-occasions',
  'symbols-tier3',
  'materials-tier3',
];

// Patterns to flag. Word-boundary matching is case-insensitive.
const BANNED: Array<{ pattern: RegExp; note: string }> = [
  { pattern: /\bperfect gift\b/i, note: '"perfect gift"' },
  { pattern: /\bmust[- ]have\b/i, note: '"must-have"' },
  { pattern: /\btrendy\b/i, note: '"trendy"' },
  { pattern: /\bloved one(s)?\b/i, note: '"loved one(s)"' },
  { pattern: /\bshe['’]ll love\b/i, note: '"she\'ll love"' },
  { pattern: /\bhe['’]ll love\b/i, note: '"he\'ll love"' },
  { pattern: /\bcelebrate (their|her|his) memory\b/i, note: '"celebrate their memory"' },
  { pattern: /\bcelebrate (their|her|his) life\b/i, note: '"celebrate their life"' },
  { pattern: /\bhonor (their|her|his) memory\b/i, note: '"honor their memory"' },
  { pattern: /\bfind closure\b/i, note: '"find closure"' },
  { pattern: /\brainbow bridge\b/i, note: '"rainbow bridge"' },
  { pattern: /\bfur (baby|babies|kid|kids)\b/i, note: '"fur baby/kid"' },
  { pattern: /\bin a better place\b/i, note: '"in a better place"' },
  { pattern: /\bpassed (over|away peacefully)\b/i, note: '"passed over"' },
  { pattern: /\btook (their|her|his) last breath\b/i, note: '"took their last breath"' },
  { pattern: /\blost (their|her|his) battle\b/i, note: '"lost their battle"' },
  { pattern: /\bstunning\b/i, note: '"stunning"' },
  { pattern: /\bgorgeous\b/i, note: '"gorgeous"' },
  { pattern: /\babsolutely love\b/i, note: '"absolutely love"' },
  { pattern: /\bwow factor\b/i, note: '"wow factor"' },
  { pattern: /\bshow (off|her you care|him you care)\b/i, note: '"show off"' },
  { pattern: /\bshop now\b/i, note: '"shop now"' },
  { pattern: /\bsay it all\b/i, note: '"say it all"' },
  { pattern: /\bfresh start\b/i, note: '"fresh start"' },
  { pattern: /\bboss babe\b/i, note: '"boss babe"' },
  { pattern: /\bgirl boss\b/i, note: '"girl boss"' },
  { pattern: /\blevel up\b/i, note: '"level up"' },
  { pattern: /\bmanifest your\b/i, note: '"manifest your"' },
  { pattern: /\bwarrior\b/i, note: '"warrior" (verify context: cancer/illness)' },
  { pattern: /\bspoil her\b/i, note: '"spoil her"' },
  { pattern: /\btreat yourself\b/i, note: '"treat yourself"' },
  { pattern: /\btis the season\b/i, note: '"tis the season"' },
  { pattern: /[!]/, note: 'exclamation point' },
  { pattern: /\bspirit animal\b/i, note: '"spirit animal" — use totem' },
];

type Hit = { file: string; field: string; phrase: string; snippet: string };

function findHits(text: string, file: string, field: string): Hit[] {
  const hits: Hit[] = [];
  for (const { pattern, note } of BANNED) {
    const m = text.match(pattern);
    if (m && m.index !== undefined) {
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + m[0].length + 30);
      hits.push({
        file,
        field,
        phrase: note,
        snippet: '...' + text.slice(start, end).replace(/\s+/g, ' ') + '...',
      });
    }
  }
  return hits;
}

function scanFile(file: string): Hit[] {
  const json = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
  const all: Hit[] = [];
  for (const [field, value] of Object.entries(json)) {
    if (field === 'slug') continue;
    if (field === 'faq' && Array.isArray(value)) {
      for (const qa of value as Array<{ q?: string; a?: string }>) {
        if (qa.a) all.push(...findHits(qa.a, file, 'faq.a'));
        // q is exempt: see header
      }
      continue;
    }
    if (typeof value === 'string') {
      all.push(...findHits(value, file, field));
    }
  }
  return all;
}

function main() {
  const fail = process.argv.includes('--fail');
  let total = 0;
  for (const bucket of BUCKETS) {
    const dir = path.join(process.cwd(), 'src', 'content', bucket);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.endsWith('.brief.json'));
    for (const f of files) {
      const full = path.join(dir, f);
      const hits = scanFile(full);
      if (hits.length === 0) continue;
      total += hits.length;
      console.log(`\n[${bucket}/${f}]`);
      for (const h of hits) {
        console.log(`  ✗ ${h.phrase}  (${h.field})`);
        console.log(`    ${h.snippet}`);
      }
    }
  }
  if (total === 0) {
    console.log('No banned-phrase hits across Tier 3 buckets.');
  } else {
    console.log(`\n${total} banned-phrase hit(s).`);
    if (fail) process.exit(1);
  }
}

main();
