import fs from 'node:fs';
import path from 'node:path';

export type SymbolContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  meaning: string;
  in_jewelry: string;
  how_to_wear: string;
  faq: Array<{ q: string; a: string }>;
};

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'symbolism');

export function getSymbolContent(slug: string): SymbolContent | null {
  try {
    const file = path.join(CONTENT_DIR, `${slug}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as SymbolContent;
  } catch {
    return null;
  }
}

export function getAllSymbolContentSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.brief.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
