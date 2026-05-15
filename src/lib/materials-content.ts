// Static imports — populated as the materials generator produces JSONs.
// Empty for now; will update.

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

const CONTENT_MAP: Record<string, MaterialContent> = {};

export function getMaterialContent(slug: string): MaterialContent | null {
  return CONTENT_MAP[slug] ?? null;
}

export function getAllMaterialContentSlugs(): string[] {
  return Object.keys(CONTENT_MAP);
}
