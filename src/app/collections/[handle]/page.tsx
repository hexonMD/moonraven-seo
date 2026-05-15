import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/ProductCard';
import { getCollectionByHandle, getAllCollectionHandles } from '@/lib/shopify';

export const revalidate = 1800;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export async function generateStaticParams() {
  const handles = await getAllCollectionHandles().catch(() => [] as string[]);
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const c = await getCollectionByHandle(handle).catch(() => null);
  if (!c) return { title: 'Collection not found' };

  return {
    title: c.title,
    description: c.description?.slice(0, 200) || `Shop the ${c.title} collection.`,
    alternates: { canonical: `${SITE_URL}/collections/${c.handle}` },
    openGraph: {
      title: c.title,
      description: c.description?.slice(0, 200) ?? '',
      type: 'website',
      url: `${SITE_URL}/collections/${c.handle}`,
      images: c.image?.url ? [{ url: c.image.url }] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle).catch((err: unknown) => {
    console.error('[collection]', handle, err);
    return null;
  });

  if (!collection) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.description,
    url: `${SITE_URL}/collections/${collection.handle}`,
    hasPart: collection.products.nodes.map((p) => ({
      '@type': 'Product',
      name: p.title,
      url: `${SITE_URL}/products/${p.handle}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-xs eyebrow text-[var(--color-text-soft)] mb-6">
        <Link href="/" className="hover:text-[var(--color-text)]">
          Home
        </Link>{' '}
        / <span className="text-[var(--color-text)]">{collection.title}</span>
      </nav>

      <header className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-3 text-[var(--color-text-soft)] max-w-2xl mx-auto">
            {collection.description}
          </p>
        ) : null}
      </header>

      {collection.products.nodes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {collection.products.nodes.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="text-[var(--color-text-soft)] text-center py-12">
          No products in this collection yet.
        </p>
      )}
    </div>
  );
}
