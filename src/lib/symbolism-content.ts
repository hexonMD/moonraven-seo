// Static imports so the bundler embeds each JSON in the build output.
// Filesystem reads via fs.readFileSync don't work on Cloudflare Workers
// runtime — the data dir isn't on the worker's filesystem after bundling.
import ravenContent from '@/content/symbolism/raven.json';
import skullContent from '@/content/symbolism/skull.json';
import antlerContent from '@/content/symbolism/antler.json';

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

// As we add more symbols, just import + append here.
const CONTENT_MAP: Record<string, SymbolContent> = {
  raven: ravenContent as SymbolContent,
  skull: skullContent as SymbolContent,
  antler: antlerContent as SymbolContent,
};

export function getSymbolContent(slug: string): SymbolContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllSymbolContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
