import sterlingSilver from '@/content/materials/sterling-silver.json';
import oxidizedBronze from '@/content/materials/oxidized-bronze.json';
import solidBronze from '@/content/materials/solid-bronze.json';
import whiteBronze from '@/content/materials/white-bronze.json';
import copper from '@/content/materials/copper.json';

export type MaterialContent = {
  slug: string;
  seo_title: string;
  meta_description: string;
  intro: string;
  properties: string;
  care: string;
  who_chooses: string;
  faq: Array<{ q: string; a: string }>;
};

const CONTENT_MAP: Record<string, MaterialContent> = {
  'sterling-silver': sterlingSilver as MaterialContent,
  'oxidized-bronze': oxidizedBronze as MaterialContent,
  'solid-bronze': solidBronze as MaterialContent,
  'white-bronze': whiteBronze as MaterialContent,
  copper: copper as MaterialContent,
};

export function getMaterialContent(slug: string): MaterialContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllMaterialContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
