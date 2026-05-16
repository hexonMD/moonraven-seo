/**
 * Occasion pSEO configs — Tier 2.
 *
 * Emotional-search-intent pages keyed to life events: pregnancy loss,
 * pet loss, retirement, graduation, divorce, sobriety, etc. These pages
 * intersect with memorial/gift content but stand alone because the search
 * volume is occasion-driven, not recipient-driven.
 *
 * Pages are exported as Shopify native pages with handle
 * `<occasion>` (no prefix — already specific) or `<occasion>-jewelry`,
 * and templateSuffix='pseo'.
 *
 * Grief-aware copy rules from memorial-config.ts apply: NO "rainbow bridge",
 * NO "fur baby", NO "celebrate their memory", NO "find closure". The slug
 * `rainbow-bridge-pet-memorial` exists for SEO targeting only — the body
 * copy must NOT use that phrase.
 */

export type OccasionKind = 'grief' | 'milestone' | 'transition';

export type OccasionConfig = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  kind: OccasionKind;
  primaryQuery: string;
  relatedQueries: string[];
  // What the page is "about" emotionally — passed into the writer prompt
  context: string;
  productFilters: string[];
  hook: string;
};

export const OCCASIONS: OccasionConfig[] = [
  // ─── Grief — pregnancy / infant loss ────────────────────────────────────
  {
    slug: 'miscarriage-remembrance-jewelry',
    handle: 'miscarriage-remembrance-jewelry',
    label: 'Miscarriage Remembrance Jewelry',
    title: 'Miscarriage Remembrance Jewelry',
    kind: 'grief',
    primaryQuery: 'miscarriage remembrance jewelry',
    relatedQueries: [
      'miscarriage memorial necklace',
      'jewelry for miscarriage mom',
      'pregnancy loss necklace',
      'remembrance jewelry for miscarriage',
    ],
    context: 'jewelry for those grieving a miscarriage — early, mid, or late pregnancy loss. The grief is real, frequently invisible, and almost always unwitnessed.',
    productFilters: ['memorial', 'small', 'keepsake', 'feather', 'moon'],
    hook: 'For the love that began before anyone else knew.',
  },
  {
    slug: 'infant-loss-keepsake',
    handle: 'infant-loss-keepsake',
    label: 'Infant Loss Keepsake Jewelry',
    title: 'Infant and Baby Loss Keepsake Jewelry',
    kind: 'grief',
    primaryQuery: 'infant loss keepsake jewelry',
    relatedQueries: [
      'baby loss memorial necklace',
      'stillbirth keepsake jewelry',
      'jewelry for parents who lost a baby',
      'sids memorial jewelry',
    ],
    context: 'jewelry for parents who have lost an infant — to stillbirth, to SIDS, to early infancy. The smallest, most particular grief.',
    productFilters: ['memorial', 'small', 'keepsake', 'feather', 'moon'],
    hook: 'A piece sized to a grief most people don\'t have words for.',
  },
  {
    slug: 'baby-loss-father-keepsake',
    handle: 'baby-loss-father-keepsake',
    label: 'Baby Loss Keepsake for Father',
    title: 'Baby Loss Keepsake Jewelry for a Father',
    kind: 'grief',
    primaryQuery: 'baby loss jewelry for dad',
    relatedQueries: [
      'fathers grief miscarriage jewelry',
      'stillbirth memorial men',
      'pregnancy loss jewelry husband',
    ],
    context: 'jewelry for fathers grieving a miscarriage, stillbirth, or infant loss — a grief whose witnesses too often skip past the man in the room.',
    productFilters: ['memorial', 'bronze', 'keepsake', 'small'],
    hook: 'For the grief no one asked him about.',
  },

  // ─── Grief — pet loss ───────────────────────────────────────────────────
  {
    slug: 'rainbow-bridge-pet-memorial',
    handle: 'rainbow-bridge-pet-memorial',
    label: 'Pet Memorial Jewelry (Rainbow Bridge)',
    title: 'Pet Memorial Jewelry — A Keepsake When Your Animal Has Gone Ahead',
    kind: 'grief',
    primaryQuery: 'rainbow bridge pet memorial jewelry',
    relatedQueries: [
      'pet memorial necklace',
      'dog cremation jewelry',
      'cat memorial pendant',
      'pet keepsake jewelry',
    ],
    context: 'jewelry for the loss of a pet — dog, cat, horse, bird, small animal. The "rainbow bridge" search term is the user\'s entry point but the page itself should NOT use that phrase. Treat the loss seriously.',
    productFilters: ['pet', 'paw', 'memorial', 'cremation', 'urn'],
    hook: 'For the animal who knew your routine better than you did.',
  },

  // ─── Grief — adult loss / sympathy ──────────────────────────────────────
  {
    slug: 'in-memory-of-grandmother-jewelry',
    handle: 'in-memory-of-grandmother-jewelry',
    label: 'In Memory of Grandmother Jewelry',
    title: 'In Memory of Grandmother — Memorial Jewelry',
    kind: 'grief',
    primaryQuery: 'in memory of grandmother jewelry',
    relatedQueries: [
      'grandmother remembrance necklace',
      'grandma memorial jewelry',
      'nana keepsake jewelry',
      'jewelry for grandmother who passed',
    ],
    context: 'memorial jewelry for the loss of a grandmother. Long, patient love. Often the first close death the wearer has known.',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'A small weight to carry the woman who taught you patience.',
  },
  {
    slug: 'widow-memorial-jewelry',
    handle: 'widow-memorial-jewelry',
    label: 'Memorial Jewelry for a Widow or Widower',
    title: 'Memorial Jewelry for Widows and Widowers',
    kind: 'grief',
    primaryQuery: 'widow memorial jewelry',
    relatedQueries: [
      'widower memorial necklace',
      'jewelry for widow husband died',
      'memorial jewelry spouse loss',
      'wedding ring widow alternative',
    ],
    context: 'memorial jewelry for those who have lost a spouse. Wearable alternatives to the wedding ring; pieces that hold ash, hair, or only the memory.',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'Something to wear when the wedding ring no longer makes sense and removing it is worse.',
  },
  {
    slug: 'sympathy-gift-jewelry',
    handle: 'sympathy-gift-jewelry',
    label: 'Sympathy Gift Jewelry',
    title: 'Sympathy Gift Jewelry — When You Don\'t Know What to Send',
    kind: 'grief',
    primaryQuery: 'sympathy gift jewelry',
    relatedQueries: [
      'condolence jewelry gift',
      'bereavement gift jewelry',
      'thoughtful sympathy gift',
      'grief gift jewelry',
    ],
    context: 'a buyer guide for someone choosing a sympathy gift for a grieving friend or family member. Frame as practical guidance: when to send jewelry, when not to, what to write, how to choose.',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake', 'feather', 'raven'],
    hook: 'When the casserole has been delivered and you still don\'t know what to do.',
  },

  // ─── Milestone / celebration ────────────────────────────────────────────
  {
    slug: 'anniversary-jewelry-symbolism',
    handle: 'anniversary-jewelry-symbolism',
    label: 'Anniversary Jewelry Symbolism',
    title: 'Anniversary Jewelry Symbolism by Year',
    kind: 'milestone',
    primaryQuery: 'anniversary jewelry symbolism',
    relatedQueries: [
      'anniversary jewelry by year',
      'meaningful anniversary necklace',
      'symbolic anniversary gift',
      'wedding anniversary jewelry meaning',
    ],
    context: 'a guide to the symbolic and traditional materials associated with wedding anniversaries (bronze for 8th, silver for 25th, etc) and how to choose meaningful pieces.',
    productFilters: ['raven', 'celtic', 'moon', 'feather', 'antler'],
    hook: 'The years counted in metal, the metal counted in meaning.',
  },
  {
    slug: 'graduation-talisman',
    handle: 'graduation-talisman',
    label: 'Graduation Talisman Jewelry',
    title: 'Graduation Talisman Jewelry — A Symbol to Carry Forward',
    kind: 'milestone',
    primaryQuery: 'graduation talisman necklace',
    relatedQueries: [
      'meaningful graduation jewelry',
      'symbolic graduation gift',
      'graduation pendant gift',
      'talisman gift for graduate',
    ],
    context: 'jewelry as a symbolic gift for graduation — high school, college, advanced degree. A talisman for what is next.',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'amulet'],
    hook: 'A piece for the threshold — something to hold when the next room is unfamiliar.',
  },
  {
    slug: 'retirement-jewelry-symbolism',
    handle: 'retirement-jewelry-symbolism',
    label: 'Retirement Jewelry Symbolism',
    title: 'Retirement Jewelry — A Symbol for the Next Chapter',
    kind: 'milestone',
    primaryQuery: 'retirement jewelry gift symbolism',
    relatedQueries: [
      'meaningful retirement gift jewelry',
      'symbolic retirement necklace',
      'retirement pendant gift',
    ],
    context: 'jewelry as a marker of retirement — a meaningful piece for someone closing one long chapter and beginning another. Avoid cake-and-clock cliches.',
    productFilters: ['raven', 'moon', 'antler', 'celtic'],
    hook: 'For the chapter that gets to be quieter.',
  },
  {
    slug: 'sobriety-milestone-jewelry',
    handle: 'sobriety-milestone-jewelry',
    label: 'Sobriety Milestone Jewelry',
    title: 'Sobriety Milestone Jewelry — A Piece for the Days Counted',
    kind: 'milestone',
    primaryQuery: 'sobriety milestone jewelry',
    relatedQueries: [
      'sobriety anniversary necklace',
      'recovery jewelry gift',
      '1 year sober gift jewelry',
      'aa milestone jewelry',
    ],
    context: 'jewelry as a marker of sobriety — 30 days, 90, one year, five. Recovery is a slow private accumulation; the piece should reflect that.',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'celtic'],
    hook: 'A small weight to mark the days that nobody else has been counting with you.',
  },
  {
    slug: 'cancer-survivor-talisman',
    handle: 'cancer-survivor-talisman',
    label: 'Cancer Survivor Talisman Jewelry',
    title: 'Cancer Survivor Talisman Jewelry',
    kind: 'milestone',
    primaryQuery: 'cancer survivor jewelry gift',
    relatedQueries: [
      'survivor necklace cancer',
      'cancer remission jewelry',
      'meaningful cancer gift jewelry',
      'chemo survivor jewelry',
    ],
    context: 'jewelry as a marker for someone who has come through cancer treatment. Avoid "warrior" rhetoric. Acknowledge the body keeps a record.',
    productFilters: ['raven', 'moon', 'feather', 'talisman', 'snake'],
    hook: 'For the body that kept going while the rest of you wasn\'t sure.',
  },

  // ─── Transition ─────────────────────────────────────────────────────────
  {
    slug: 'new-chapter-jewelry',
    handle: 'new-chapter-jewelry',
    label: 'New Chapter Jewelry',
    title: 'New Chapter Jewelry — Pieces for Beginnings That Don\'t Feel Easy',
    kind: 'transition',
    primaryQuery: 'new chapter jewelry',
    relatedQueries: [
      'fresh start necklace',
      'new beginning jewelry gift',
      'milestone necklace for woman',
      'symbolic jewelry transition',
    ],
    context: 'jewelry as a marker for a major life transition — moving, leaving a job, ending or starting a relationship, choosing oneself.',
    productFilters: ['raven', 'moon', 'snake', 'feather', 'talisman'],
    hook: 'A piece for the morning that begins differently than the last one.',
  },
  {
    slug: 'moving-away-keepsake',
    handle: 'moving-away-keepsake',
    label: 'Moving Away Keepsake Jewelry',
    title: 'Moving Away Keepsake Jewelry — A Piece of Home to Carry',
    kind: 'transition',
    primaryQuery: 'moving away gift jewelry',
    relatedQueries: [
      'going away keepsake necklace',
      'long distance friend gift jewelry',
      'leaving home jewelry gift',
      'farewell gift jewelry',
    ],
    context: 'jewelry as a parting gift for someone moving away — to a new city, a new country, a new life. For the giver and the goer both.',
    productFilters: ['raven', 'moon', 'feather', 'celtic', 'talisman'],
    hook: 'A weight to carry from the old room to the new one.',
  },
  {
    slug: 'divorce-recovery-jewelry',
    handle: 'divorce-recovery-jewelry',
    label: 'Divorce Recovery Jewelry',
    title: 'Divorce Recovery Jewelry — A Marker for the Other Side',
    kind: 'transition',
    primaryQuery: 'divorce recovery jewelry',
    relatedQueries: [
      'jewelry after divorce',
      'gift to self after divorce',
      'post divorce necklace',
      'new beginning after divorce jewelry',
    ],
    context: 'jewelry as a marker for someone who has come through a divorce — a piece chosen by oneself, for oneself, when the ring comes off.',
    productFilters: ['raven', 'moon', 'snake', 'feather', 'talisman'],
    hook: 'Something to wear on the hand that just got lighter.',
  },
];

export function getOccasion(slug: string): OccasionConfig | null {
  return OCCASIONS.find((o) => o.slug === slug) ?? null;
}
