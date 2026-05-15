export type MaterialConfig = {
  slug: string;
  label: string;
  // Tags / words used to match products in this material category.
  matchTerms: string[];
  hook: string;
};

export const MATERIALS: MaterialConfig[] = [
  {
    slug: 'sterling-silver',
    label: 'Sterling Silver',
    matchTerms: ['sterling silver', 'silver'],
    hook: 'The classic — 925 silver, ages with you, takes patina kindly.',
  },
  {
    slug: 'oxidized-bronze',
    label: 'Oxidized Bronze',
    matchTerms: ['oxidized bronze', 'oxidized'],
    hook: 'Bronze darkened on purpose — depth in the recesses, warmth on the highs.',
  },
  {
    slug: 'solid-bronze',
    label: 'Solid Bronze',
    matchTerms: ['solid bronze', 'bronze'],
    hook: 'Heavier than silver, warmer in tone, ancient in tradition.',
  },
  {
    slug: 'white-bronze',
    label: 'White Bronze',
    matchTerms: ['white bronze'],
    hook: 'A silver-toned bronze — durable, hypoallergenic, the practical sibling.',
  },
  {
    slug: 'copper',
    label: 'Copper',
    matchTerms: ['copper'],
    hook: 'Living metal — patinas through wear, no two pieces age alike.',
  },
];

export function getMaterial(slug: string): MaterialConfig | null {
  return MATERIALS.find((m) => m.slug === slug) ?? null;
}
