/**
 * Care Occasions pSEO configs — Tier 3.
 *
 * Emotional / life-transition contexts not covered in Tier 2. Tier 2 already
 * covered: miscarriage-remembrance-jewelry, infant-loss-keepsake,
 * baby-loss-father-keepsake, rainbow-bridge-pet-memorial,
 * in-memory-of-grandmother-jewelry, widow-memorial-jewelry,
 * sympathy-gift-jewelry, anniversary-jewelry-symbolism, graduation-talisman,
 * retirement-jewelry-symbolism, sobriety-milestone-jewelry,
 * cancer-survivor-talisman, new-chapter-jewelry, moving-away-keepsake,
 * divorce-recovery-jewelry. Do not duplicate any of those.
 *
 * Grief-aware copy rules apply: NO "rainbow bridge", NO "fur baby",
 * NO "celebrate their memory", NO "find closure", NO "warrior" (cancer),
 * NO "fresh start" as central frame.
 */

export type CareOccasionKind = 'grief' | 'milestone' | 'transition' | 'celebration';

export type CareOccasionConfig = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  kind: CareOccasionKind;
  primaryQuery: string;
  relatedQueries: string[];
  context: string;
  productFilters: string[];
  hook: string;
};

export const CARE_OCCASIONS: CareOccasionConfig[] = [
  {
    slug: 'retirement-self-gift-jewelry',
    handle: 'retirement-self-gift-jewelry',
    label: 'Retirement Self-Gift Jewelry',
    title: 'Retirement Jewelry — A Self-Chosen Talisman for the Next Chapter',
    kind: 'transition',
    primaryQuery: 'retirement jewelry for yourself',
    relatedQueries: [
      'retirement self gift jewelry',
      'buying jewelry to mark retirement',
      'self purchase retirement necklace',
      'retirement talisman for woman',
      'meaningful retirement piece for myself',
    ],
    context: 'jewelry chosen by oneself to mark retirement — a piece picked deliberately when one career closes and another rhythm begins. Distinct from the gold-watch-from-the-company tradition.',
    productFilters: ['raven', 'moon', 'antler', 'celtic', 'feather'],
    hook: 'For the morning you do not set an alarm and the room is finally yours.',
  },
  {
    slug: 'new-home-blessing-jewelry',
    handle: 'new-home-blessing-jewelry',
    label: 'New Home Blessing Jewelry',
    title: 'New Home Blessing Jewelry — A Talisman for the Threshold',
    kind: 'celebration',
    primaryQuery: 'new home jewelry gift',
    relatedQueries: [
      'housewarming jewelry gift',
      'new house necklace meaningful',
      'home blessing pendant',
      'moving into new home gift jewelry',
      'first home talisman gift',
    ],
    context: 'jewelry as a marker for a new home — first apartment, first house, a return to a homeland, or simply a new threshold. A talisman to bring with you across the door.',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'talisman'],
    hook: 'For the key in your hand and the room that does not yet know your footsteps.',
  },
  {
    slug: 'get-well-gift-handcrafted-jewelry',
    handle: 'get-well-gift-handcrafted-jewelry',
    label: 'Handcrafted Get Well Gift Jewelry',
    title: 'Handcrafted Get Well Gift Jewelry',
    kind: 'transition',
    primaryQuery: 'get well gift jewelry',
    relatedQueries: [
      'meaningful get well necklace',
      'handcrafted get well jewelry',
      'symbolic gift for someone sick',
      'illness recovery jewelry gift',
      'thinking of you jewelry illness',
    ],
    context: 'jewelry as a get-well gift — for someone in long illness, in recovery, in chronic-health management. Avoid "battle" and "warrior" framings. The body is doing what bodies do, and a small wearable thing can be a steady companion.',
    productFilters: ['raven', 'moon', 'snake', 'feather', 'talisman'],
    hook: 'For the body keeping its own slow appointment, and the friend who would like a witness.',
  },
  {
    slug: 'deployment-keepsake-jewelry-military',
    handle: 'deployment-keepsake-jewelry-military',
    label: 'Deployment Keepsake Jewelry',
    title: 'Deployment Keepsake Jewelry — A Piece to Hold the Distance',
    kind: 'transition',
    primaryQuery: 'deployment keepsake jewelry',
    relatedQueries: [
      'military deployment necklace gift',
      'deployment jewelry for wife',
      'jewelry for military partner deployed',
      'keepsake for soldier deployment',
      'long distance military jewelry gift',
    ],
    context: 'jewelry as a marker for a deployment — for the partner, parent, or child staying behind, or for the service member leaving. The distance is real; the piece is a steady weight to hold during it.',
    productFilters: ['raven', 'celtic', 'bronze', 'wolf', 'antler', 'feather'],
    hook: 'For the months counted in time zones and the small kept thing that stays in the same room as you.',
  },
  {
    slug: 'cancer-remission-anniversary-jewelry',
    handle: 'cancer-remission-anniversary-jewelry',
    label: 'Cancer Remission Anniversary Jewelry',
    title: 'Cancer Remission Anniversary Jewelry',
    kind: 'milestone',
    primaryQuery: 'cancer remission anniversary jewelry',
    relatedQueries: [
      'one year cancer free jewelry gift',
      'cancer remission necklace',
      'remission anniversary necklace',
      'cancerversary jewelry meaningful',
      'no evidence of disease jewelry',
    ],
    context: 'jewelry as a marker for a remission anniversary — one year, five, ten. Quiet acknowledgment, not victory parade. The body keeps a record; the piece is its witness.',
    productFilters: ['raven', 'moon', 'snake', 'feather', 'talisman'],
    hook: 'For the date she remembers without checking, and would rather mark privately than publicly.',
  },
  {
    slug: 'postpartum-mother-talisman-jewelry',
    handle: 'postpartum-mother-talisman-jewelry',
    label: 'Postpartum Mother Talisman Jewelry',
    title: 'Postpartum Mother Talisman Jewelry — A Piece for the First Year',
    kind: 'transition',
    primaryQuery: 'postpartum jewelry for new mom',
    relatedQueries: [
      'new mother talisman necklace',
      'jewelry gift for new mom meaningful',
      'fourth trimester gift jewelry',
      'jewelry for matrescence',
      'push present meaningful',
    ],
    context: 'jewelry for a mother in the postpartum year — the body in repair, the identity in transition, the nights that bend strangely. Not a "push present" in the Instagram sense. A piece for matrescence.',
    productFilters: ['moon', 'raven', 'feather', 'celtic', 'talisman'],
    hook: 'For the woman who has just become someone new and is not sleeping enough to feel it.',
  },
  {
    slug: 'empty-nest-jewelry-mother',
    handle: 'empty-nest-jewelry-mother',
    label: 'Empty Nest Jewelry for a Mother',
    title: 'Empty Nest Jewelry — A Piece for the Quieter House',
    kind: 'transition',
    primaryQuery: 'empty nest gift jewelry',
    relatedQueries: [
      'empty nester necklace',
      'mom whose kids left jewelry',
      'last child leaves home gift',
      'empty nest mother jewelry meaningful',
      'kids gone to college mom gift',
    ],
    context: 'jewelry for a mother whose last child has left home — the room that stays made, the kitchen that goes quiet at six. Not a sympathy piece. A marker of a role completed.',
    productFilters: ['raven', 'moon', 'celtic', 'antler', 'feather'],
    hook: 'For the kitchen that gets to be only yours again, and the strange weather of that.',
  },
  {
    slug: 'mother-of-bride-memorial-jewelry',
    handle: 'mother-of-bride-memorial-jewelry',
    label: 'Mother of the Bride Memorial Jewelry',
    title: 'Mother of the Bride Memorial Jewelry — Carrying Her Through the Aisle',
    kind: 'grief',
    primaryQuery: 'memorial jewelry for wedding mother of bride',
    relatedQueries: [
      'something old wedding memorial mother',
      'jewelry to honor deceased mother at wedding',
      'wedding day memorial necklace mom',
      'bride whose mother died jewelry',
      'memorial pin for wedding bouquet alternative',
    ],
    context: 'memorial jewelry for a bride whose mother has died — a small wearable way to carry her into the ceremony. Or for a mother of the bride who has lost her own mother before the wedding day.',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake', 'feather'],
    hook: 'For the seat that should have been in the front row, and the way you walk past it anyway.',
  },
  {
    slug: 'adoption-day-keepsake-jewelry',
    handle: 'adoption-day-keepsake-jewelry',
    label: 'Adoption Day Keepsake Jewelry',
    title: 'Adoption Day Keepsake Jewelry — A Piece to Mark the Family',
    kind: 'celebration',
    primaryQuery: 'adoption keepsake jewelry',
    relatedQueries: [
      'adoption day gift jewelry',
      'gotcha day necklace meaningful',
      'adoptive mom jewelry gift',
      'finalization day adoption keepsake',
      'foster to adopt jewelry gift',
    ],
    context: 'jewelry as a marker for an adoption day — finalization, foster-to-adopt, or the broader story of how a family came together. For adoptive parents, the adopted person at any age, or the families on both sides.',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'talisman'],
    hook: 'For the day a family quietly became official, and the years that built up to it.',
  },
  {
    slug: 'coming-out-pride-jewelry-meaningful',
    handle: 'coming-out-pride-jewelry-meaningful',
    label: 'Meaningful Coming Out and Pride Jewelry',
    title: 'Coming Out Jewelry — A Talisman for the Threshold',
    kind: 'transition',
    primaryQuery: 'coming out jewelry gift',
    relatedQueries: [
      'pride jewelry meaningful',
      'lgbtq gift jewelry',
      'queer talisman necklace',
      'coming out gift meaningful',
      'gay pride pendant gift',
    ],
    context: 'jewelry as a marker for a coming-out — to oneself, to family, to the world. Or for any pride milestone. Quiet and intentional rather than rainbow-stripe loud. A talisman to wear into the new room.',
    productFilters: ['raven', 'moon', 'snake', 'celtic', 'feather'],
    hook: 'For the version of yourself who finally got to walk into the room without ducking.',
  },
];

export function getCareOccasion(slug: string): CareOccasionConfig | null {
  return CARE_OCCASIONS.find((o) => o.slug === slug) ?? null;
}
