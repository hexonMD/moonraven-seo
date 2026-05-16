/**
 * Material pSEO configs — Tier 3.
 *
 * Material / finish / technique queries Tier 1 didn't cover. Tier 1 covered:
 * sterling-silver, solid-bronze, oxidized-bronze, copper, white-bronze.
 * Do not duplicate any of those.
 */

export type MaterialTier3Config = {
  slug: string;
  handle: string;
  label: string;
  title: string;
  // Material / finish / technique noun
  material: string;
  primaryQuery: string;
  relatedQueries: string[];
  productFilters: string[];
  hook: string;
};

export const MATERIALS_TIER3: MaterialTier3Config[] = [
  {
    slug: 'oxidized-silver-jewelry-meaning',
    handle: 'oxidized-silver-jewelry-meaning',
    label: 'Oxidized Silver Jewelry Meaning',
    title: 'Oxidized Silver Jewelry — Meaning, Process, and Care',
    material: 'oxidized sterling silver',
    primaryQuery: 'oxidized silver jewelry meaning',
    relatedQueries: [
      'what is oxidized silver',
      'blackened silver jewelry',
      'darkened sterling silver meaning',
      'oxidized silver vs sterling silver',
      'how is oxidized silver made',
    ],
    productFilters: ['oxidized', 'blackened', 'silver'],
    hook: 'Silver that has been deliberately darkened so the high points stay bright and the low points keep their shadow.',
  },
  {
    slug: 'hand-forged-jewelry-difference',
    handle: 'hand-forged-jewelry-difference',
    label: 'Hand-Forged Jewelry — What Makes It Different',
    title: 'Hand-Forged Jewelry — What Makes It Different from Cast',
    material: 'hand-forged metal',
    primaryQuery: 'hand forged jewelry difference',
    relatedQueries: [
      'hand forged vs cast jewelry',
      'what is hand forged jewelry',
      'handmade jewelry definition',
      'why hand forged is better',
      'forged vs stamped jewelry',
    ],
    productFilters: ['forged', 'handmade', 'artisan'],
    hook: 'A piece that carries the hammer marks of an actual hand on actual metal.',
  },
  {
    slug: 'vermeil-vs-gold-plated-jewelry',
    handle: 'vermeil-vs-gold-plated-jewelry',
    label: 'Vermeil vs Gold-Plated Jewelry',
    title: 'Vermeil vs Gold-Plated Jewelry — What\'s the Difference',
    material: 'vermeil',
    primaryQuery: 'vermeil vs gold plated',
    relatedQueries: [
      'what is vermeil jewelry',
      'gold vermeil meaning',
      'vermeil vs gold filled',
      'is vermeil real gold',
      'how long does vermeil last',
    ],
    productFilters: ['vermeil', 'gold', 'silver'],
    hook: 'Two ways to put gold on silver — one of them has rules, the other does not.',
  },
  {
    slug: 'recycled-sterling-silver-ethics',
    handle: 'recycled-sterling-silver-ethics',
    label: 'Recycled Sterling Silver — Ethics and Practice',
    title: 'Recycled Sterling Silver — Ethics, Practice, and What It Means',
    material: 'recycled sterling silver',
    primaryQuery: 'recycled sterling silver jewelry',
    relatedQueries: [
      'what is recycled silver',
      'eco friendly silver jewelry',
      'sustainable sterling silver',
      'ethical silver jewelry',
      'recycled vs mined silver',
    ],
    productFilters: ['recycled', 'sterling', 'silver'],
    hook: 'A metal that has already been pulled out of the ground once and does not need pulling again.',
  },
  {
    slug: 'mixed-metal-jewelry-styling',
    handle: 'mixed-metal-jewelry-styling',
    label: 'Mixed Metal Jewelry — Styling Notes',
    title: 'Mixed Metal Jewelry — Styling Notes',
    material: 'mixed metals',
    primaryQuery: 'how to mix metals jewelry',
    relatedQueries: [
      'mixing silver and gold jewelry',
      'mixed metal necklace styling',
      'two tone jewelry styling',
      'can you wear silver and bronze together',
      'mixed metal jewelry rules',
    ],
    productFilters: ['bronze', 'silver', 'mixed'],
    hook: 'The old rule was: do not mix metals. The newer one is: mix them on purpose.',
  },
  {
    slug: 'antique-finish-jewelry-care',
    handle: 'antique-finish-jewelry-care',
    label: 'Antique Finish Jewelry — Meaning and Care',
    title: 'Antique Finish Jewelry — Meaning, Care, and Why It Ages',
    material: 'antique-finish metal',
    primaryQuery: 'antique finish jewelry meaning',
    relatedQueries: [
      'what is antique finish jewelry',
      'antique silver finish meaning',
      'antiqued jewelry care',
      'patina jewelry meaning',
      'aged finish jewelry care',
    ],
    productFilters: ['antique', 'oxidized', 'patina'],
    hook: 'Metal that has been finished to look like it has been carried for a long time.',
  },
  {
    slug: 'gemstone-set-sterling-silver-jewelry',
    handle: 'gemstone-set-sterling-silver-jewelry',
    label: 'Gemstone-Set Sterling Silver Jewelry',
    title: 'Gemstone-Set Sterling Silver Jewelry — Choosing the Right Stone',
    material: 'gemstone-set sterling silver',
    primaryQuery: 'gemstone sterling silver jewelry',
    relatedQueries: [
      'sterling silver with gemstone necklace',
      'silver and stone jewelry meaning',
      'choosing gemstone for silver jewelry',
      'silver setting for gemstones',
      'meaningful gemstones in silver',
    ],
    productFilters: ['gemstone', 'stone', 'sterling', 'silver'],
    hook: 'A small stone held by a metal that knows how to hold things.',
  },
  {
    slug: 'blacksmith-jewelry-handcrafted',
    handle: 'blacksmith-jewelry-handcrafted',
    label: 'Blacksmith-Style Handcrafted Jewelry',
    title: 'Blacksmith-Style Handcrafted Jewelry — Forged Metal as Adornment',
    material: 'blacksmith-forged metal',
    primaryQuery: 'blacksmith jewelry handmade',
    relatedQueries: [
      'forged iron jewelry',
      'blacksmith style necklace',
      'hand hammered jewelry',
      'metalsmith jewelry handmade',
      'forged jewelry meaning',
    ],
    productFilters: ['forged', 'hammered', 'blacksmith'],
    hook: 'A piece carrying the same shape-language as a horseshoe and a hinge.',
  },
  {
    slug: 'lost-wax-cast-jewelry-explained',
    handle: 'lost-wax-cast-jewelry-explained',
    label: 'Lost-Wax Cast Jewelry — Explained',
    title: 'Lost-Wax Cast Jewelry — The Process Explained',
    material: 'lost-wax cast metal',
    primaryQuery: 'lost wax cast jewelry',
    relatedQueries: [
      'lost wax casting process',
      'cire perdue jewelry',
      'what is lost wax jewelry',
      'investment casting jewelry',
      'wax casting necklace process',
    ],
    productFilters: ['cast', 'sterling', 'bronze'],
    hook: 'A method old enough to have made the gold mask of Tutankhamun and the wedding band on your finger.',
  },
  {
    slug: 'mokume-gane-jewelry-explained',
    handle: 'mokume-gane-jewelry-explained',
    label: 'Mokume-Gane Jewelry Explained',
    title: 'Mokume-Gane Jewelry — Meaning, Process, and Pattern',
    material: 'mokume-gane',
    primaryQuery: 'mokume gane jewelry',
    relatedQueries: [
      'what is mokume gane',
      'mokume gane wedding ring',
      'wood grain metal jewelry',
      'mokume gane process',
      'japanese mixed metal jewelry',
    ],
    productFilters: ['mokume', 'mixed metal', 'wedding'],
    hook: 'Japanese metalwork that lets the layers under a surface show through as wood-grain weather.',
  },
];

export function getMaterialTier3(slug: string): MaterialTier3Config | null {
  return MATERIALS_TIER3.find((m) => m.slug === slug) ?? null;
}
