/**
 * Symbol pSEO configs — Tier 3.
 *
 * Symbolism pages for motifs not covered in Tier 1. Tier 1 covered:
 * raven, wolf, antler, bone, snake, skull, feather, moon, evil eye,
 * norse runes, celtic knot, horse. Do not duplicate any of those.
 *
 * Backup candidates if a primary scores <5 grounding:
 *   spider, hummingbird, swallow, lotus, wishbone, key, arrow,
 *   eye-of-providence, oak-leaf, pine-cone.
 */

export type SymbolTier3Config = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  // The symbol noun (moth, butterfly, owl, etc)
  symbol: string;
  primaryQuery: string;
  relatedQueries: string[];
  productFilters: string[];
  hook: string;
};

export const SYMBOLS_TIER3: SymbolTier3Config[] = [
  {
    slug: 'moth-symbolism-jewelry',
    handle: 'moth-symbolism-jewelry',
    label: 'Moth Symbolism in Jewelry',
    title: 'Moth Symbolism in Jewelry — Meaning and Mythology',
    symbol: 'moth',
    primaryQuery: 'moth symbolism jewelry',
    relatedQueries: [
      'moth meaning necklace',
      'death moth jewelry meaning',
      'luna moth symbolism',
      'moth spiritual meaning',
      'moth pendant meaning',
    ],
    productFilters: ['moth', 'butterfly', 'wings'],
    hook: 'The night cousin of the butterfly — drawn to small lights in long dark.',
  },
  {
    slug: 'butterfly-symbolism-jewelry',
    handle: 'butterfly-symbolism-jewelry',
    label: 'Butterfly Symbolism in Jewelry',
    title: 'Butterfly Symbolism in Jewelry — Transformation and Meaning',
    symbol: 'butterfly',
    primaryQuery: 'butterfly symbolism jewelry',
    relatedQueries: [
      'butterfly necklace meaning',
      'butterfly spiritual meaning',
      'butterfly pendant symbolism',
      'butterfly tattoo meaning',
      'monarch butterfly symbolism',
    ],
    productFilters: ['butterfly', 'moth', 'wings'],
    hook: 'The creature whose body has been remade from the inside out.',
  },
  {
    slug: 'owl-symbolism-jewelry',
    handle: 'owl-symbolism-jewelry',
    label: 'Owl Symbolism in Jewelry',
    title: 'Owl Symbolism in Jewelry — Wisdom and Night Sight',
    symbol: 'owl',
    primaryQuery: 'owl symbolism jewelry',
    relatedQueries: [
      'owl necklace meaning',
      'owl pendant symbolism',
      'spiritual meaning of owl',
      'owl jewelry significance',
      'Athena owl symbolism',
    ],
    productFilters: ['owl', 'strix', 'night bird'],
    hook: 'The bird that sees clearly at the hour everyone else gives up trying.',
  },
  {
    slug: 'fox-symbolism-jewelry',
    handle: 'fox-symbolism-jewelry',
    label: 'Fox Symbolism in Jewelry',
    title: 'Fox Symbolism in Jewelry — Cunning, Solitude, and the Liminal',
    symbol: 'fox',
    primaryQuery: 'fox symbolism jewelry',
    relatedQueries: [
      'fox necklace meaning',
      'fox spirit animal meaning',
      'fox pendant symbolism',
      'kitsune jewelry meaning',
      'fox tattoo meaning',
    ],
    productFilters: ['fox', 'vulpes', 'kit'],
    hook: 'The animal who arrives at the edge of the garden and stays just long enough.',
  },
  {
    slug: 'bee-symbolism-jewelry',
    handle: 'bee-symbolism-jewelry',
    label: 'Bee Symbolism in Jewelry',
    title: 'Bee Symbolism in Jewelry — Industry, Sweetness, and the Hive',
    symbol: 'bee',
    primaryQuery: 'bee symbolism jewelry',
    relatedQueries: [
      'bee necklace meaning',
      'bee spiritual meaning',
      'honeybee pendant symbolism',
      'queen bee jewelry meaning',
      'bee tattoo significance',
    ],
    productFilters: ['bee', 'honey', 'hive'],
    hook: 'The small worker who builds the geometry of the hive without ever drawing a plan.',
  },
  {
    slug: 'octopus-symbolism-jewelry',
    handle: 'octopus-symbolism-jewelry',
    label: 'Octopus Symbolism in Jewelry',
    title: 'Octopus Symbolism in Jewelry — Intelligence and the Deep',
    symbol: 'octopus',
    primaryQuery: 'octopus symbolism jewelry',
    relatedQueries: [
      'octopus necklace meaning',
      'octopus tattoo meaning',
      'octopus spiritual significance',
      'kraken jewelry meaning',
      'cephalopod jewelry meaning',
    ],
    productFilters: ['octopus', 'cephalopod', 'tentacle'],
    hook: 'The cold-water philosopher with eight arms and three hearts.',
  },
  {
    slug: 'dragon-symbolism-jewelry',
    handle: 'dragon-symbolism-jewelry',
    label: 'Dragon Symbolism in Jewelry',
    title: 'Dragon Symbolism in Jewelry — Power, Fire, and Ancient Memory',
    symbol: 'dragon',
    primaryQuery: 'dragon symbolism jewelry',
    relatedQueries: [
      'dragon necklace meaning',
      'dragon pendant symbolism',
      'celtic dragon meaning',
      'chinese dragon symbolism',
      'dragon tattoo meaning',
    ],
    productFilters: ['dragon', 'wyrm', 'serpent'],
    hook: 'The creature too old for the period it lives in.',
  },
  {
    slug: 'anchor-symbolism-jewelry',
    handle: 'anchor-symbolism-jewelry',
    label: 'Anchor Symbolism in Jewelry',
    title: 'Anchor Symbolism in Jewelry — Hope and the Steady Weight',
    symbol: 'anchor',
    primaryQuery: 'anchor symbolism jewelry',
    relatedQueries: [
      'anchor necklace meaning',
      'anchor pendant symbolism',
      'anchor tattoo meaning',
      'nautical jewelry symbolism',
      'hope anchor jewelry meaning',
    ],
    productFilters: ['anchor', 'nautical', 'sea'],
    hook: 'The weight you set deliberately so the rest of the boat can move.',
  },
  {
    slug: 'sun-moon-jewelry-symbolism',
    handle: 'sun-moon-jewelry-symbolism',
    label: 'Sun and Moon Jewelry Symbolism',
    title: 'Sun and Moon Jewelry — Symbolism of the Pair',
    symbol: 'sun and moon',
    primaryQuery: 'sun and moon jewelry meaning',
    relatedQueries: [
      'sun and moon necklace meaning',
      'sun moon pendant symbolism',
      'celestial jewelry meaning',
      'sun moon couple jewelry',
      'duality jewelry symbolism',
    ],
    productFilters: ['sun', 'moon', 'celestial', 'crescent'],
    hook: 'Two halves of the same day, drawn together where they actually meet.',
  },
  {
    slug: 'scarab-beetle-symbolism-jewelry',
    handle: 'scarab-beetle-symbolism-jewelry',
    label: 'Scarab and Beetle Symbolism in Jewelry',
    title: 'Scarab and Beetle Symbolism in Jewelry',
    symbol: 'scarab beetle',
    primaryQuery: 'scarab symbolism jewelry',
    relatedQueries: [
      'scarab necklace meaning',
      'beetle pendant symbolism',
      'egyptian scarab meaning jewelry',
      'scarab amulet meaning',
      'beetle spiritual meaning',
    ],
    productFilters: ['scarab', 'beetle', 'egyptian'],
    hook: 'The small creature the Egyptians wore against the chest because the sun gets rolled forward every morning.',
  },
];

export function getSymbolTier3(slug: string): SymbolTier3Config | null {
  return SYMBOLS_TIER3.find((s) => s.slug === slug) ?? null;
}
