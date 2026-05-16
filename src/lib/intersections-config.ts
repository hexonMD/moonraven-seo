/**
 * Symbol × material intersection pSEO configs — Tier 2.
 *
 * Each page targets a "<material> <symbol> jewelry/necklace" query — these
 * are unusually buy-intent because the searcher already knows the symbol AND
 * the metal they want.
 *
 * Pages are exported as Shopify native pages with handle
 * `<material>-<symbol>-jewelry` and templateSuffix='pseo'.
 *
 * Only intersections backed by real Moon Raven inventory are included
 * (verified via Shopify product search Apr 2026: bronze 183 SKUs,
 * sterling 107 SKUs, oxidized 12 SKUs; raven 187, wolf 31, skull 68,
 * snake 11, feather 21, antler 30, horse 30, bone 33).
 */

export type IntersectionConfig = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  // The material (sterling silver, bronze, oxidized bronze)
  material: string;
  // The symbol (raven, wolf, skull, snake, etc)
  symbol: string;
  primaryQuery: string;
  relatedQueries: string[];
  // Tags / words used to filter Moonraven products into the grid
  productFilters: string[];
  hook: string;
};

export const INTERSECTIONS: IntersectionConfig[] = [
  // ─── Sterling silver × symbol ───────────────────────────────────────────
  {
    slug: 'sterling-silver-raven-jewelry',
    handle: 'sterling-silver-raven-jewelry',
    label: 'Sterling Silver Raven Jewelry',
    title: 'Sterling Silver Raven Jewelry',
    material: 'sterling silver',
    symbol: 'raven',
    primaryQuery: 'sterling silver raven necklace',
    relatedQueries: [
      'silver raven pendant',
      'sterling silver crow jewelry',
      '925 silver raven necklace',
    ],
    productFilters: ['raven', 'crow', 'corvid'],
    hook: 'The bird of memory cast in the metal of memory — 925 silver, ages with you.',
  },
  {
    slug: 'sterling-silver-skull-jewelry',
    handle: 'sterling-silver-skull-jewelry',
    label: 'Sterling Silver Skull Jewelry',
    title: 'Sterling Silver Skull and Memento Mori Jewelry',
    material: 'sterling silver',
    symbol: 'skull',
    primaryQuery: 'sterling silver skull necklace',
    relatedQueries: [
      'silver skull pendant',
      'sterling silver memento mori',
      '925 silver skull jewelry',
    ],
    productFilters: ['skull', 'cranium', 'memento mori'],
    hook: 'Memento mori in 925 sterling — the kind of weight a daily reminder should have.',
  },
  {
    slug: 'sterling-silver-wolf-jewelry',
    handle: 'sterling-silver-wolf-jewelry',
    label: 'Sterling Silver Wolf Jewelry',
    title: 'Sterling Silver Wolf Jewelry',
    material: 'sterling silver',
    symbol: 'wolf',
    primaryQuery: 'sterling silver wolf necklace',
    relatedQueries: [
      'silver wolf pendant',
      'sterling silver wolf jewelry mens',
      '925 silver wolf necklace',
    ],
    productFilters: ['wolf', 'wolves', 'lupine'],
    hook: 'Kinship and loyalty in 925 silver — built for daily wear, ages true.',
  },
  {
    slug: 'sterling-silver-snake-jewelry',
    handle: 'sterling-silver-snake-jewelry',
    label: 'Sterling Silver Snake Jewelry',
    title: 'Sterling Silver Snake and Serpent Jewelry',
    material: 'sterling silver',
    symbol: 'snake',
    primaryQuery: 'sterling silver snake necklace',
    relatedQueries: [
      'silver serpent pendant',
      'sterling silver snake ring',
      '925 silver snake jewelry',
    ],
    productFilters: ['snake', 'serpent', 'viper'],
    hook: 'Shedding and renewal cast in 925 silver — a piece that catches light like scales.',
  },
  {
    slug: 'sterling-silver-feather-jewelry',
    handle: 'sterling-silver-feather-jewelry',
    label: 'Sterling Silver Feather Jewelry',
    title: 'Sterling Silver Feather Jewelry',
    material: 'sterling silver',
    symbol: 'feather',
    primaryQuery: 'sterling silver feather necklace',
    relatedQueries: [
      'silver feather pendant',
      'sterling silver feather earrings',
      '925 silver feather jewelry',
    ],
    productFilters: ['feather'],
    hook: 'Lightness cast in heavier metal — the way a feather feels when you finally hold one.',
  },
  {
    slug: 'sterling-silver-antler-jewelry',
    handle: 'sterling-silver-antler-jewelry',
    label: 'Sterling Silver Antler Jewelry',
    title: 'Sterling Silver Antler and Stag Jewelry',
    material: 'sterling silver',
    symbol: 'antler',
    primaryQuery: 'sterling silver antler necklace',
    relatedQueries: [
      'silver antler pendant',
      'sterling silver stag jewelry',
      '925 silver deer antler necklace',
    ],
    productFilters: ['antler', 'stag', 'elk', 'deer'],
    hook: 'Shed and regrown each season — the cycle, in metal that holds detail.',
  },
  {
    slug: 'sterling-silver-horse-jewelry',
    handle: 'sterling-silver-horse-jewelry',
    label: 'Sterling Silver Horse Jewelry',
    title: 'Sterling Silver Horse and Equestrian Jewelry',
    material: 'sterling silver',
    symbol: 'horse',
    primaryQuery: 'sterling silver horse necklace',
    relatedQueries: [
      'silver horse pendant',
      'sterling silver equestrian jewelry',
      '925 silver horse jewelry',
    ],
    productFilters: ['horse', 'equine', 'equestrian', 'hoof'],
    hook: 'For the rider whose ring catches on the bridle and she leaves it anyway.',
  },
  {
    slug: 'sterling-silver-bone-jewelry',
    handle: 'sterling-silver-bone-jewelry',
    label: 'Sterling Silver Bone Jewelry',
    title: 'Sterling Silver Bone and Skeleton Jewelry',
    material: 'sterling silver',
    symbol: 'bone',
    primaryQuery: 'sterling silver bone necklace',
    relatedQueries: [
      'silver bone pendant',
      'sterling silver vertebra jewelry',
      '925 silver bone jewelry',
    ],
    productFilters: ['bone', 'rib', 'spine', 'jaw', 'tooth'],
    hook: 'The architecture beneath, cast at 1:1 — small bones held close.',
  },

  // ─── Solid bronze × symbol ──────────────────────────────────────────────
  {
    slug: 'bronze-raven-jewelry',
    handle: 'bronze-raven-jewelry',
    label: 'Bronze Raven Jewelry',
    title: 'Bronze Raven Jewelry',
    material: 'bronze',
    symbol: 'raven',
    primaryQuery: 'bronze raven necklace',
    relatedQueries: [
      'solid bronze raven pendant',
      'bronze crow jewelry',
      'bronze raven jewelry mens',
    ],
    productFilters: ['raven', 'crow', 'corvid'],
    hook: 'Warmer in tone, heavier in hand — the raven as it would have been forged in the iron age.',
  },
  {
    slug: 'bronze-skull-jewelry',
    handle: 'bronze-skull-jewelry',
    label: 'Bronze Skull Jewelry',
    title: 'Bronze Skull and Memento Mori Jewelry',
    material: 'bronze',
    symbol: 'skull',
    primaryQuery: 'bronze skull necklace',
    relatedQueries: [
      'solid bronze skull pendant',
      'bronze memento mori',
      'bronze skull jewelry',
    ],
    productFilters: ['skull', 'cranium', 'memento mori'],
    hook: 'Mortality in a metal that outlasts the wearer — bronze keeps the lesson.',
  },
  {
    slug: 'bronze-wolf-jewelry',
    handle: 'bronze-wolf-jewelry',
    label: 'Bronze Wolf Jewelry',
    title: 'Bronze Wolf Jewelry',
    material: 'bronze',
    symbol: 'wolf',
    primaryQuery: 'bronze wolf necklace',
    relatedQueries: [
      'solid bronze wolf pendant',
      'bronze wolf jewelry mens',
      'bronze lupine jewelry',
    ],
    productFilters: ['wolf', 'wolves', 'lupine'],
    hook: 'Warm-toned, heavy, ancient — the wolf in a metal that has known fire since before iron.',
  },
  {
    slug: 'bronze-snake-jewelry',
    handle: 'bronze-snake-jewelry',
    label: 'Bronze Snake Jewelry',
    title: 'Bronze Snake and Serpent Jewelry',
    material: 'bronze',
    symbol: 'snake',
    primaryQuery: 'bronze snake necklace',
    relatedQueries: [
      'solid bronze serpent pendant',
      'bronze snake ring',
      'bronze serpent jewelry',
    ],
    productFilters: ['snake', 'serpent', 'viper'],
    hook: 'The serpent in bronze — a coil with weight, a renewal you can feel against the sternum.',
  },
  {
    slug: 'bronze-antler-jewelry',
    handle: 'bronze-antler-jewelry',
    label: 'Bronze Antler Jewelry',
    title: 'Bronze Antler and Stag Jewelry',
    material: 'bronze',
    symbol: 'antler',
    primaryQuery: 'bronze antler necklace',
    relatedQueries: [
      'solid bronze antler pendant',
      'bronze stag jewelry',
      'bronze deer antler necklace',
    ],
    productFilters: ['antler', 'stag', 'elk', 'deer'],
    hook: 'Antlers in bronze — the cycle held in metal that warms to your skin.',
  },
  {
    slug: 'bronze-feather-jewelry',
    handle: 'bronze-feather-jewelry',
    label: 'Bronze Feather Jewelry',
    title: 'Bronze Feather Jewelry',
    material: 'bronze',
    symbol: 'feather',
    primaryQuery: 'bronze feather necklace',
    relatedQueries: [
      'solid bronze feather pendant',
      'bronze feather jewelry',
      'bronze feather earrings',
    ],
    productFilters: ['feather'],
    hook: 'A bronze feather — the paradox made literal: weight and lightness at once.',
  },

  // ─── Oxidized bronze × raven ────────────────────────────────────────────
  {
    slug: 'oxidized-bronze-raven-jewelry',
    handle: 'oxidized-bronze-raven-jewelry',
    label: 'Oxidized Bronze Raven Jewelry',
    title: 'Oxidized Bronze Raven Jewelry',
    material: 'oxidized bronze',
    symbol: 'raven',
    primaryQuery: 'oxidized bronze raven necklace',
    relatedQueries: [
      'dark bronze raven pendant',
      'patinated bronze raven jewelry',
      'oxidized raven necklace',
    ],
    productFilters: ['raven', 'crow', 'corvid', 'oxidized'],
    hook: 'Bronze darkened on purpose — the raven against its own shadow.',
  },
];

export function getIntersection(slug: string): IntersectionConfig | null {
  return INTERSECTIONS.find((i) => i.slug === slug) ?? null;
}
