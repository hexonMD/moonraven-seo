import type { MetadataRoute } from 'next';
import {
  getAllProductHandles,
  getAllCollectionHandles,
  getAllPages,
  getAllArticles,
} from '@/lib/shopify';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, pages, articles] = await Promise.all([
    getAllProductHandles().catch(() => [] as string[]),
    getAllCollectionHandles().catch(() => [] as string[]),
    getAllPages().catch(() => []),
    getAllArticles().catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/collections/all`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const productEntries: MetadataRoute.Sitemap = products.map((h) => ({
    url: `${SITE_URL}/products/${h}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections.map((h) => ({
    url: `${SITE_URL}/collections/${h}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const pageEntries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${SITE_URL}/pages/${p.handle}`,
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.blog.handle}/${a.handle}`,
    lastModified: a.publishedAt ?? undefined,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...productEntries, ...collectionEntries, ...pageEntries, ...articleEntries];
}
