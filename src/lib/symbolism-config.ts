export type SymbolConfig = {
  slug: string;
  title: string;
  // Display label in nav / breadcrumbs
  label: string;
  // Search terms to match Moonraven products by title or tag.
  // Matched case-insensitively; substring match.
  matchTerms: string[];
  // One-line hook shown on the symbolism index page
  hook: string;
};

export const SYMBOLS: SymbolConfig[] = [
  {
    slug: 'raven',
    title: 'Raven Symbolism in Jewelry',
    label: 'Raven',
    matchTerms: ['raven', 'crow', 'corvid'],
    hook: 'Messengers between worlds — memory, prophecy, and the dark wisdom of the corvid.',
  },
  {
    slug: 'skull',
    title: 'Skull Symbolism in Jewelry',
    label: 'Skull',
    matchTerms: ['skull', 'cranium', 'memento mori', 'sugar skull'],
    hook: 'A reminder that what is precious is precious because it is finite.',
  },
  {
    slug: 'snake',
    title: 'Snake & Serpent Symbolism in Jewelry',
    label: 'Snake',
    matchTerms: ['snake', 'serpent', 'viper', 'cobra', 'vertebrae'],
    hook: 'Shedding, renewal, and the long memory carried in the spine.',
  },
  {
    slug: 'feather',
    title: 'Feather Symbolism in Jewelry',
    label: 'Feather',
    matchTerms: ['feather'],
    hook: 'Ascent, lightness, and the prayers that travel on wings.',
  },
  {
    slug: 'antler',
    title: 'Antler Symbolism in Jewelry',
    label: 'Antler',
    matchTerms: ['antler', 'horn', 'stag', 'elk', 'deer'],
    hook: 'Shed and regrown each season — a quiet emblem of cyclic strength.',
  },
  {
    slug: 'horse',
    title: 'Horse Symbolism in Jewelry',
    label: 'Horse',
    matchTerms: ['horse', 'equine', 'equestrian', 'mare', 'stallion'],
    hook: 'Freedom and the bond of partnership — for riders and those who loved one.',
  },
  {
    slug: 'wolf',
    title: 'Wolf Symbolism in Jewelry',
    label: 'Wolf',
    matchTerms: ['wolf', 'wolves', 'lupine'],
    hook: 'Kin, loyalty, and the long howl that carries across centuries.',
  },
  {
    slug: 'norse-runes',
    title: 'Norse Rune Symbolism in Jewelry',
    label: 'Norse Runes',
    matchTerms: ['rune', 'norse', 'viking', 'odin', 'thor', 'valknut', 'futhark', 'mjolnir'],
    hook: 'Old marks of protection, journey, and the will to endure.',
  },
  {
    slug: 'moon',
    title: 'Moon Symbolism in Jewelry',
    label: 'Moon',
    matchTerms: ['moon', 'crescent', 'lunar', 'celestial'],
    hook: 'The patient cycle — waxing, full, waning, dark, return.',
  },
  {
    slug: 'celtic-knot',
    title: 'Celtic Knot Symbolism in Jewelry',
    label: 'Celtic Knot',
    matchTerms: ['celtic', 'knot', 'triquetra', 'trinity', 'spiral'],
    hook: 'Lines without end — the woven nature of life, death, and love.',
  },
  {
    slug: 'bone',
    title: 'Bone Symbolism in Jewelry',
    label: 'Bone',
    matchTerms: ['bone', 'rib', 'spine', 'jaw', 'tooth', 'fang', 'claw'],
    hook: 'What remains — the architecture beneath every flesh.',
  },
  {
    slug: 'eye',
    title: 'Eye Symbolism in Jewelry',
    label: 'Eye',
    matchTerms: ['eye', 'evil eye', 'all-seeing', 'horus', 'nazar'],
    hook: 'Vigilance, protection, and the gaze that returns.',
  },
];

export function getSymbol(slug: string): SymbolConfig | null {
  return SYMBOLS.find((s) => s.slug === slug) ?? null;
}

export function matchProductsToSymbol<
  T extends { title?: string; tags?: string[]; productType?: string },
>(products: T[], symbol: SymbolConfig): T[] {
  const terms = symbol.matchTerms.map((t) => t.toLowerCase());
  return products.filter((p) => {
    const hay = [
      p.title ?? '',
      p.productType ?? '',
      ...(p.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return terms.some((t) => hay.includes(t));
  });
}
