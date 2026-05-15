export type MemorialKind = 'human' | 'pet';

export type MemorialConfig = {
  slug: string;
  label: string; // Display in nav/breadcrumbs (e.g. "Mother", "Pet — Dog")
  kind: MemorialKind;
  // Search terms for product matching (memorial / cremation pieces).
  // Always include 'memorial', 'cremation', 'urn', 'ash' so we surface
  // the right product category.
  productKeywords: string[];
  // One-line hook for the index page card. Reverent, not maudlin.
  hook: string;
  // Specific relationship token used in copy generation — what the page
  // is "for". E.g. "loss of a mother", "loss of a beloved dog".
  griefSubject: string;
};

export const MEMORIALS: MemorialConfig[] = [
  // ─── Human loss — parent ────────────────────────────────────────────────
  {
    slug: 'mother',
    label: 'Mother',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'Pieces to hold a mother close — quietly, every day.',
    griefSubject: 'loss of a mother',
  },
  {
    slug: 'father',
    label: 'Father',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'A way to carry the steady presence of a father.',
    griefSubject: 'loss of a father',
  },
  {
    slug: 'parent',
    label: 'Parent',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the long, complicated love of a parent now gone.',
    griefSubject: 'loss of a parent',
  },
  // ─── Human loss — spouse ────────────────────────────────────────────────
  {
    slug: 'spouse',
    label: 'Spouse',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'Memorial pieces for a partner kept close in metal and intention.',
    griefSubject: 'loss of a spouse or partner',
  },
  {
    slug: 'husband',
    label: 'Husband',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'A piece to carry a husband near — solid, quiet, true.',
    griefSubject: 'loss of a husband',
  },
  {
    slug: 'wife',
    label: 'Wife',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For carrying a wife into the next chapter, however long it takes.',
    griefSubject: 'loss of a wife',
  },
  // ─── Human loss — child ─────────────────────────────────────────────────
  {
    slug: 'child',
    label: 'Child',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the love that does not lessen with absence — for a child.',
    griefSubject: 'loss of a child',
  },
  {
    slug: 'son',
    label: 'Son',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'A piece to hold the shape of a son who has gone ahead.',
    griefSubject: 'loss of a son',
  },
  {
    slug: 'daughter',
    label: 'Daughter',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For carrying a daughter close — by hand, by heart, by metal.',
    griefSubject: 'loss of a daughter',
  },
  {
    slug: 'baby',
    label: 'Baby / Infant',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake', 'small'],
    hook: 'Memorial pieces sized for the smallest, most particular grief.',
    griefSubject: 'loss of an infant or baby',
  },
  {
    slug: 'pregnancy-loss',
    label: 'Pregnancy Loss',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the love that began before anyone else knew. Miscarriage and stillbirth pieces.',
    griefSubject: 'pregnancy loss, miscarriage, or stillbirth',
  },
  // ─── Human loss — sibling ───────────────────────────────────────────────
  {
    slug: 'sibling',
    label: 'Sibling',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the kind of loss only a sibling can name.',
    griefSubject: 'loss of a sibling',
  },
  {
    slug: 'brother',
    label: 'Brother',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'Memorial pieces for a brother — quiet, durable, his.',
    griefSubject: 'loss of a brother',
  },
  {
    slug: 'sister',
    label: 'Sister',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'A piece to hold the particular shape of a sister.',
    griefSubject: 'loss of a sister',
  },
  // ─── Human loss — grandparent ───────────────────────────────────────────
  {
    slug: 'grandparent',
    label: 'Grandparent',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For carrying forward a grandparent\'s long memory.',
    griefSubject: 'loss of a grandparent',
  },
  {
    slug: 'grandmother',
    label: 'Grandmother',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'A piece for a grandmother — the steady, particular love of her.',
    griefSubject: 'loss of a grandmother',
  },
  {
    slug: 'grandfather',
    label: 'Grandfather',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'Memorial pieces for a grandfather — kept close, like the stories were.',
    griefSubject: 'loss of a grandfather',
  },
  // ─── Human loss — friend ────────────────────────────────────────────────
  {
    slug: 'friend',
    label: 'Friend',
    kind: 'human',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For a friend whose absence the official rituals don\'t quite cover.',
    griefSubject: 'loss of a close friend',
  },
  // ─── Pet loss ───────────────────────────────────────────────────────────
  {
    slug: 'pet-dog',
    label: 'Pet — Dog',
    kind: 'pet',
    productKeywords: ['pet', 'paw', 'memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the loyal one. Dog memorial pieces and ash keepsakes.',
    griefSubject: 'loss of a beloved dog',
  },
  {
    slug: 'pet-cat',
    label: 'Pet — Cat',
    kind: 'pet',
    productKeywords: ['pet', 'paw', 'cat', 'memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the strange small companion. Cat memorial jewelry.',
    griefSubject: 'loss of a beloved cat',
  },
  {
    slug: 'pet-horse',
    label: 'Pet — Horse',
    kind: 'pet',
    productKeywords: ['horse', 'hoof', 'memorial', 'cremation', 'urn', 'ash', 'keepsake', 'equestrian'],
    hook: 'For the years of riding, brushing, listening. Horse memorial pieces.',
    griefSubject: 'loss of a horse',
  },
  {
    slug: 'pet-bird',
    label: 'Pet — Bird',
    kind: 'pet',
    productKeywords: ['bird', 'feather', 'memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For the small, song-shaped grief of losing a bird.',
    griefSubject: 'loss of a pet bird',
  },
  {
    slug: 'pet-rabbit',
    label: 'Pet — Rabbit',
    kind: 'pet',
    productKeywords: ['rabbit', 'memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'Memorial pieces for a rabbit kept close.',
    griefSubject: 'loss of a pet rabbit',
  },
  {
    slug: 'pet-small-animal',
    label: 'Pet — Small Animal',
    kind: 'pet',
    productKeywords: ['memorial', 'cremation', 'urn', 'ash', 'keepsake', 'tiny', 'small'],
    hook: 'For hamsters, rats, guinea pigs, and every small creature that left a shape behind.',
    griefSubject: 'loss of a small pet (hamster, rat, guinea pig, etc.)',
  },
  {
    slug: 'pet',
    label: 'Pet (any)',
    kind: 'pet',
    productKeywords: ['pet', 'paw', 'memorial', 'cremation', 'urn', 'ash', 'keepsake'],
    hook: 'For any animal who shared your life — the parent hub for pet memorial pieces.',
    griefSubject: 'loss of a beloved pet',
  },
];

export function getMemorial(slug: string): MemorialConfig | null {
  return MEMORIALS.find((m) => m.slug === slug) ?? null;
}
