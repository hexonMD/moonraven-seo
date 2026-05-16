/**
 * Gift guide pSEO configs — Tier 2.
 *
 * Recipient × symbol/occasion intersections aimed at strong commercial-intent
 * gift queries. Each page is exported as a Shopify native page with handle
 * `gift-<recipient>-<symbol-or-occasion>` and templateSuffix='pseo'.
 */

export type GiftGuideConfig = {
  slug: string;
  // Page handle on Shopify (also drives /pages/<handle> URL)
  handle: string;
  label: string;
  // Display H1 / nav label
  title: string;
  // Primary commercial query the page targets
  primaryQuery: string;
  // Other queries the page should cover
  relatedQueries: string[];
  // Recipient archetype (used in copy gen for tone)
  recipient: string;
  // Symbolic / emotional anchor of the gift (raven, memorial, talisman, etc)
  anchor: string;
  // Shopify product search keywords — surfaces relevant SKUs in the grid
  productFilters: string[];
  // One-line hook (used on index cards if/when we build them)
  hook: string;
};

export const GIFT_GUIDES: GiftGuideConfig[] = [
  // ─── Recipient: Mom ─────────────────────────────────────────────────────
  {
    slug: 'gift-mom-raven',
    handle: 'gift-mom-raven',
    label: 'Raven Gifts for Mom',
    title: 'Raven Jewelry Gifts for Mom',
    primaryQuery: 'raven necklace gift for mom',
    relatedQueries: [
      'raven jewelry for mother',
      'gothic gift for mom',
      'witchy jewelry for mom',
      'raven pendant gift mother',
    ],
    recipient: 'a mother',
    anchor: 'raven',
    productFilters: ['raven', 'crow', 'corvid'],
    hook: 'For the mother whose shelves hold Mary Oliver, Margaret Atwood, and a small black feather.',
  },
  {
    slug: 'gift-mom-memorial',
    handle: 'gift-mom-memorial',
    label: 'Memorial Gifts for a Mother Who Has Passed',
    title: 'Memorial Jewelry Gifts for a Mother Who Has Passed',
    primaryQuery: 'memorial gift for someone who lost their mother',
    relatedQueries: [
      'sympathy gift mother death',
      'remembrance gift for daughter who lost mother',
      'gift for friend whose mother died',
    ],
    recipient: 'someone who has lost their mother',
    anchor: 'memorial',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'For when the mother is the one being remembered, not the one receiving.',
  },

  // ─── Recipient: Dad ─────────────────────────────────────────────────────
  {
    slug: 'gift-dad-skull',
    handle: 'gift-dad-skull',
    label: 'Skull Jewelry Gifts for Dad',
    title: 'Skull and Memento Mori Gifts for Dad',
    primaryQuery: 'skull necklace gift for dad',
    relatedQueries: [
      'memento mori gift for father',
      'gothic gift for dad',
      'skull jewelry gift father',
      'metal dad jewelry gift',
    ],
    recipient: 'a father',
    anchor: 'skull',
    productFilters: ['skull', 'memento mori'],
    hook: 'For the father who reads philosophy at the kitchen table and thinks about mortality as a useful thing.',
  },
  {
    slug: 'gift-dad-bronze',
    handle: 'gift-dad-bronze',
    label: 'Bronze Jewelry Gifts for Dad',
    title: 'Bronze Jewelry Gifts for Dad',
    primaryQuery: 'bronze necklace gift for dad',
    relatedQueries: [
      'bronze pendant for father',
      'mens bronze jewelry gift',
      'rugged jewelry gift dad',
    ],
    recipient: 'a father',
    anchor: 'bronze',
    productFilters: ['bronze'],
    hook: 'A metal that takes a beating, ages well, and never asks for a polish — like the man.',
  },
  {
    slug: 'gift-dad-memorial',
    handle: 'gift-dad-memorial',
    label: 'Memorial Gifts for a Father Who Has Passed',
    title: 'Memorial Jewelry for the Loss of a Father',
    primaryQuery: 'memorial gift for loss of father',
    relatedQueries: [
      'sympathy gift father death',
      'remembrance jewelry dad died',
      'keepsake for someone who lost their father',
    ],
    recipient: 'someone who has lost their father',
    anchor: 'memorial',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'A weight to wear when the steady presence has gone quiet.',
  },

  // ─── Recipient: Daughter ────────────────────────────────────────────────
  {
    slug: 'gift-daughter-talisman',
    handle: 'gift-daughter-talisman',
    label: 'Talisman Jewelry Gifts for Daughter',
    title: 'Talismanic Jewelry Gifts for a Daughter',
    primaryQuery: 'talisman necklace gift for daughter',
    relatedQueries: [
      'protection jewelry for daughter',
      'meaningful jewelry gift daughter',
      'symbolic necklace gift for daughter',
    ],
    recipient: 'a daughter',
    anchor: 'talisman',
    productFilters: ['talisman', 'amulet', 'protection', 'raven', 'moon'],
    hook: 'Something small and pocket-shaped for her to carry into the harder rooms.',
  },
  {
    slug: 'gift-daughter-graduation',
    handle: 'gift-daughter-graduation',
    label: 'Graduation Jewelry Gifts for Daughter',
    title: 'Graduation Jewelry Gifts for a Daughter',
    primaryQuery: 'graduation jewelry gift for daughter',
    relatedQueries: [
      'graduation necklace daughter',
      'meaningful graduation gift daughter',
      'symbolic graduation jewelry',
    ],
    recipient: 'a daughter graduating',
    anchor: 'graduation',
    productFilters: ['raven', 'moon', 'feather', 'talisman'],
    hook: 'A piece that says she earned a thing nobody can repossess.',
  },

  // ─── Recipient: Son ─────────────────────────────────────────────────────
  {
    slug: 'gift-son-wolf',
    handle: 'gift-son-wolf',
    label: 'Wolf Jewelry Gifts for Son',
    title: 'Wolf Jewelry Gifts for a Son',
    primaryQuery: 'wolf necklace gift for son',
    relatedQueries: [
      'wolf pendant son',
      'meaningful jewelry gift son',
      'symbolic necklace son',
    ],
    recipient: 'a son',
    anchor: 'wolf',
    productFilters: ['wolf'],
    hook: 'Loyalty, kinship, and the long howl — for the boy becoming a man.',
  },

  // ─── Recipient: Sister ──────────────────────────────────────────────────
  {
    slug: 'gift-sister-moon',
    handle: 'gift-sister-moon',
    label: 'Moon Jewelry Gifts for Sister',
    title: 'Moon and Lunar Jewelry Gifts for a Sister',
    primaryQuery: 'moon necklace gift for sister',
    relatedQueries: [
      'crescent moon jewelry sister',
      'lunar necklace gift sister',
      'meaningful jewelry sister',
    ],
    recipient: 'a sister',
    anchor: 'moon',
    productFilters: ['moon', 'crescent', 'lunar'],
    hook: 'The shared cycle — for the woman who has known you since the beginning.',
  },

  // ─── Recipient: Brother ─────────────────────────────────────────────────
  {
    slug: 'gift-brother-raven',
    handle: 'gift-brother-raven',
    label: 'Raven Jewelry Gifts for Brother',
    title: 'Raven Jewelry Gifts for a Brother',
    primaryQuery: 'raven necklace gift for brother',
    relatedQueries: [
      'gothic gift brother',
      'symbolic jewelry brother',
      'raven pendant gift brother',
    ],
    recipient: 'a brother',
    anchor: 'raven',
    productFilters: ['raven', 'crow', 'corvid'],
    hook: 'For the brother who knows when not to talk.',
  },

  // ─── Recipient: Wife ────────────────────────────────────────────────────
  {
    slug: 'gift-wife-anniversary',
    handle: 'gift-wife-anniversary',
    label: 'Anniversary Jewelry Gifts for Wife',
    title: 'Anniversary Jewelry Gifts for a Wife',
    primaryQuery: 'anniversary jewelry gift for wife',
    relatedQueries: [
      'meaningful anniversary gift wife',
      'symbolic anniversary necklace wife',
      'handcrafted anniversary jewelry wife',
    ],
    recipient: 'a wife on an anniversary',
    anchor: 'anniversary',
    productFilters: ['raven', 'moon', 'celtic', 'feather', 'talisman'],
    hook: 'For the years counted in small kept things.',
  },

  // ─── Recipient: Husband ─────────────────────────────────────────────────
  {
    slug: 'gift-husband-anniversary',
    handle: 'gift-husband-anniversary',
    label: 'Anniversary Jewelry Gifts for Husband',
    title: 'Anniversary Jewelry Gifts for a Husband',
    primaryQuery: 'anniversary jewelry gift for husband',
    relatedQueries: [
      'mens anniversary necklace',
      'meaningful anniversary gift husband',
      'bronze anniversary gift man',
    ],
    recipient: 'a husband on an anniversary',
    anchor: 'anniversary',
    productFilters: ['bronze', 'raven', 'wolf', 'antler'],
    hook: 'Something solid to mark the years he has actually been there.',
  },

  // ─── Recipient: Grandmother / Grandfather ───────────────────────────────
  {
    slug: 'gift-grandmother',
    handle: 'gift-grandmother',
    label: 'Meaningful Jewelry Gifts for Grandmother',
    title: 'Meaningful Jewelry Gifts for a Grandmother',
    primaryQuery: 'meaningful jewelry gift for grandmother',
    relatedQueries: [
      'grandma necklace gift',
      'symbolic jewelry grandmother',
      'sentimental gift grandma',
    ],
    recipient: 'a grandmother',
    anchor: 'grandmother',
    productFilters: ['raven', 'moon', 'celtic', 'feather'],
    hook: 'For the woman who taught you which birds were which.',
  },
  {
    slug: 'gift-grandfather-memorial',
    handle: 'gift-grandfather-memorial',
    label: 'Memorial Gifts for a Grandfather Who Has Passed',
    title: 'Memorial Jewelry for the Loss of a Grandfather',
    primaryQuery: 'memorial gift loss of grandfather',
    relatedQueries: [
      'grandpa remembrance jewelry',
      'keepsake for grandfather who died',
      'memorial necklace grandfather',
    ],
    recipient: 'someone who has lost their grandfather',
    anchor: 'memorial',
    productFilters: ['memorial', 'cremation', 'urn', 'keepsake'],
    hook: 'For the stories you will keep telling without him.',
  },

  // ─── Persona / archetype gifts ──────────────────────────────────────────
  {
    slug: 'gift-witch',
    handle: 'gift-witch',
    label: 'Jewelry Gifts for a Witch',
    title: 'Jewelry Gifts for a Witch',
    primaryQuery: 'gifts for a witch',
    relatedQueries: [
      'witchy jewelry gift',
      'pagan necklace gift',
      'occult jewelry gift',
      'gift for witchcraft practitioner',
    ],
    recipient: 'a practicing witch or pagan',
    anchor: 'witch',
    productFilters: ['raven', 'moon', 'crescent', 'snake', 'feather', 'talisman'],
    hook: 'For the friend whose altar is more curated than most living rooms.',
  },
  {
    slug: 'gift-goth-girlfriend',
    handle: 'gift-goth-girlfriend',
    label: 'Gothic Jewelry Gifts for a Girlfriend',
    title: 'Gothic Jewelry Gifts for a Girlfriend',
    primaryQuery: 'gothic gift for girlfriend',
    relatedQueries: [
      'dark jewelry gift girlfriend',
      'goth necklace gift',
      'spooky jewelry for partner',
    ],
    recipient: 'a partner with a gothic aesthetic',
    anchor: 'gothic',
    productFilters: ['skull', 'raven', 'bone', 'snake'],
    hook: 'For the person who finds funeral roses prettier than fresh ones.',
  },
  {
    slug: 'gift-equestrian',
    handle: 'gift-equestrian',
    label: 'Jewelry Gifts for an Equestrian',
    title: 'Jewelry Gifts for an Equestrian or Horse Lover',
    primaryQuery: 'jewelry gifts for horse lovers',
    relatedQueries: [
      'equestrian necklace gift',
      'horse pendant gift',
      'jewelry for rider',
    ],
    recipient: 'a rider or horse owner',
    anchor: 'horse',
    productFilters: ['horse', 'equine', 'hoof'],
    hook: 'For the woman who smells like hay and brushes before she eats.',
  },
  {
    slug: 'gift-nature-lover',
    handle: 'gift-nature-lover',
    label: 'Jewelry Gifts for a Nature Lover',
    title: 'Meaningful Jewelry Gifts for a Nature Lover',
    primaryQuery: 'jewelry gifts for nature lovers',
    relatedQueries: [
      'naturalist jewelry gift',
      'bird watcher gift',
      'outdoorsy jewelry gift',
    ],
    recipient: 'someone who lives most fully outdoors',
    anchor: 'nature',
    productFilters: ['raven', 'antler', 'feather', 'wolf', 'bone'],
    hook: 'For the friend who can name every bird at the feeder without looking up.',
  },
  {
    slug: 'gift-writer-raven',
    handle: 'gift-writer-raven',
    label: 'Raven Jewelry Gifts for a Writer',
    title: 'Raven Jewelry Gifts for a Writer',
    primaryQuery: 'gift for a writer jewelry',
    relatedQueries: [
      'raven necklace writer',
      'gift for poet',
      'literary jewelry gift',
      'jewelry gift for author',
    ],
    recipient: 'a writer, poet, or working author',
    anchor: 'raven',
    productFilters: ['raven', 'crow', 'corvid', 'feather'],
    hook: 'For the friend whose desk is two parts coffee, one part panic.',
  },

  // ─── Pet loss ───────────────────────────────────────────────────────────
  {
    slug: 'gift-pet-loss',
    handle: 'gift-pet-loss',
    label: 'Memorial Gifts for the Loss of a Pet',
    title: 'Sympathy and Memorial Gifts for the Loss of a Pet',
    primaryQuery: 'memorial gift for pet loss',
    relatedQueries: [
      'sympathy gift dog death',
      'cat memorial gift',
      'pet loss jewelry gift',
      'pet remembrance jewelry',
    ],
    recipient: 'someone grieving a pet',
    anchor: 'pet-memorial',
    productFilters: ['pet', 'paw', 'memorial', 'cremation', 'urn'],
    hook: 'For the friend whose house is suddenly the wrong shape.',
  },
];

export function getGiftGuide(slug: string): GiftGuideConfig | null {
  return GIFT_GUIDES.find((g) => g.slug === slug) ?? null;
}
