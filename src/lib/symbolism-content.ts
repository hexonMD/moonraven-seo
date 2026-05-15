// Static imports so the bundler embeds each JSON in the build output.
// Filesystem reads via fs.readFileSync don't work on Cloudflare Workers
// runtime — the data dir isn't on the worker's filesystem after bundling.
import ravenContent from '@/content/symbolism/raven.json';
import skullContent from '@/content/symbolism/skull.json';
import antlerContent from '@/content/symbolism/antler.json';
import snakeContent from '@/content/symbolism/snake.json';
import wolfContent from '@/content/symbolism/wolf.json';
import norseRunesContent from '@/content/symbolism/norse-runes.json';
import celticKnotContent from '@/content/symbolism/celtic-knot.json';
import boneContent from '@/content/symbolism/bone.json';
import eyeContent from '@/content/symbolism/eye.json';
import horseContent from '@/content/symbolism/horse.json';
import moonContent from '@/content/symbolism/moon.json';

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
  snake: snakeContent as SymbolContent,
  wolf: wolfContent as SymbolContent,
  'norse-runes': norseRunesContent as SymbolContent,
  'celtic-knot': celticKnotContent as SymbolContent,
  bone: boneContent as SymbolContent,
  eye: eyeContent as SymbolContent,
  horse: horseContent as SymbolContent,
  moon: moonContent as SymbolContent,
};

export function getSymbolContent(slug: string): SymbolContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllSymbolContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
