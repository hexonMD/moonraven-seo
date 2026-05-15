// Static imports — only files that actually exist. Append as more are generated.
import mother from '@/content/memorial/mother.json';
import father from '@/content/memorial/father.json';
import spouse from '@/content/memorial/spouse.json';
import husband from '@/content/memorial/husband.json';
import wife from '@/content/memorial/wife.json';
import child from '@/content/memorial/child.json';
import son from '@/content/memorial/son.json';
import daughter from '@/content/memorial/daughter.json';
import baby from '@/content/memorial/baby.json';
import sibling from '@/content/memorial/sibling.json';
import brother from '@/content/memorial/brother.json';
import grandparent from '@/content/memorial/grandparent.json';
import friend from '@/content/memorial/friend.json';
import petDog from '@/content/memorial/pet-dog.json';
import petHorse from '@/content/memorial/pet-horse.json';
import petBird from '@/content/memorial/pet-bird.json';
import petRabbit from '@/content/memorial/pet-rabbit.json';

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
  mother: mother as MemorialContent,
  father: father as MemorialContent,
  spouse: spouse as MemorialContent,
  husband: husband as MemorialContent,
  wife: wife as MemorialContent,
  child: child as MemorialContent,
  son: son as MemorialContent,
  daughter: daughter as MemorialContent,
  baby: baby as MemorialContent,
  sibling: sibling as MemorialContent,
  brother: brother as MemorialContent,
  grandparent: grandparent as MemorialContent,
  friend: friend as MemorialContent,
  'pet-dog': petDog as MemorialContent,
  'pet-horse': petHorse as MemorialContent,
  'pet-bird': petBird as MemorialContent,
  'pet-rabbit': petRabbit as MemorialContent,
};

export function getMemorialContent(slug: string): MemorialContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllMemorialContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
