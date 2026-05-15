// Static imports — only files that actually exist. Append as the
// generator produces more JSONs.
import spouse from '@/content/memorial/spouse.json';
import husband from '@/content/memorial/husband.json';
import wife from '@/content/memorial/wife.json';
import grandparent from '@/content/memorial/grandparent.json';
import friend from '@/content/memorial/friend.json';

export type MemorialContent = {
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

const CONTENT_MAP: Record<string, MemorialContent> = {
  spouse: spouse as MemorialContent,
  husband: husband as MemorialContent,
  wife: wife as MemorialContent,
  grandparent: grandparent as MemorialContent,
  friend: friend as MemorialContent,
};

export function getMemorialContent(slug: string): MemorialContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllMemorialContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
