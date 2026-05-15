// Static imports so the bundler embeds each JSON in the build output.
import mother from '@/content/memorial/mother.json';
import father from '@/content/memorial/father.json';
import parent from '@/content/memorial/parent.json';
import spouse from '@/content/memorial/spouse.json';
import husband from '@/content/memorial/husband.json';
import wife from '@/content/memorial/wife.json';
import child from '@/content/memorial/child.json';
import son from '@/content/memorial/son.json';
import daughter from '@/content/memorial/daughter.json';
import baby from '@/content/memorial/baby.json';
import pregnancyLoss from '@/content/memorial/pregnancy-loss.json';
import sibling from '@/content/memorial/sibling.json';
import brother from '@/content/memorial/brother.json';
import sister from '@/content/memorial/sister.json';
import grandparent from '@/content/memorial/grandparent.json';
import grandmother from '@/content/memorial/grandmother.json';
import grandfather from '@/content/memorial/grandfather.json';
import friend from '@/content/memorial/friend.json';
import petDog from '@/content/memorial/pet-dog.json';
import petCat from '@/content/memorial/pet-cat.json';
import petHorse from '@/content/memorial/pet-horse.json';
import petBird from '@/content/memorial/pet-bird.json';
import petRabbit from '@/content/memorial/pet-rabbit.json';
import petSmallAnimal from '@/content/memorial/pet-small-animal.json';
import pet from '@/content/memorial/pet.json';

export type MemorialContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  choosing: string; // "Choosing the right piece"
  what_it_carries: string; // What the piece holds / what the wearer carries
  for_whom: string; // Who tends to choose this piece
  blessing: string; // A short closing — quote, fragment, blessing
  faq: Array<{ q: string; a: string }>;
};

const CONTENT_MAP: Record<string, MemorialContent> = {
  mother: mother as MemorialContent,
  father: father as MemorialContent,
  parent: parent as MemorialContent,
  spouse: spouse as MemorialContent,
  husband: husband as MemorialContent,
  wife: wife as MemorialContent,
  child: child as MemorialContent,
  son: son as MemorialContent,
  daughter: daughter as MemorialContent,
  baby: baby as MemorialContent,
  'pregnancy-loss': pregnancyLoss as MemorialContent,
  sibling: sibling as MemorialContent,
  brother: brother as MemorialContent,
  sister: sister as MemorialContent,
  grandparent: grandparent as MemorialContent,
  grandmother: grandmother as MemorialContent,
  grandfather: grandfather as MemorialContent,
  friend: friend as MemorialContent,
  'pet-dog': petDog as MemorialContent,
  'pet-cat': petCat as MemorialContent,
  'pet-horse': petHorse as MemorialContent,
  'pet-bird': petBird as MemorialContent,
  'pet-rabbit': petRabbit as MemorialContent,
  'pet-small-animal': petSmallAnimal as MemorialContent,
  pet: pet as MemorialContent,
};

export function getMemorialContent(slug: string): MemorialContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllMemorialContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
