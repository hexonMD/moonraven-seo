import type { MetadataRoute } from 'next';
import { getAllSymbolContentSlugs } from '@/lib/symbolism-content';
import { getAllMemorialContentSlugs } from '@/lib/memorial-content';
import { getAllMaterialContentSlugs } from '@/lib/materials-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  // Only emit the pSEO surfaces Next.js is responsible for. The home,
  // /products/*, /collections/*, /pages/*, /blog/* are served by Shopify
  // via fallback rewrite — Shopify already has its own sitemap at
  // /sitemap.xml that handles those. Submit BOTH to Search Console.

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/symbolism`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/memorial`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/materials`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  const symbolismEntries: MetadataRoute.Sitemap = getAllSymbolContentSlugs().map((slug) => ({
    url: `${SITE_URL}/symbolism/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const memorialEntries: MetadataRoute.Sitemap = getAllMemorialContentSlugs().map((slug) => ({
    url: `${SITE_URL}/memorial/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const materialEntries: MetadataRoute.Sitemap = getAllMaterialContentSlugs().map((slug) => ({
    url: `${SITE_URL}/materials/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...symbolismEntries, ...memorialEntries, ...materialEntries];
}
