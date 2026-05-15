import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getProductByHandle,
  getAllProductHandles,
  formatMoney,
  shopUrl,
} from '@/lib/shopify';

export const revalidate = 1800;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export async function generateStaticParams() {
  const handles = await getAllProductHandles().catch(() => [] as string[]);
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) return { title: 'Product not found' };

  const description = product.description?.slice(0, 200) ?? '';
  const img = product.featuredImage?.url;

  return {
    title: product.title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.handle}` },
    openGraph: {
      title: product.title,
      description,
      type: 'website',
      url: `${SITE_URL}/products/${product.handle}`,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch((err: unknown) => {
    console.error('[product]', handle, err);
    return null;
  });

  if (!product) notFound();

  const firstVariant = product.variants.nodes[0] ?? null;
  const min = product.priceRangeV2?.minVariantPrice;
  const max = product.priceRangeV2?.maxVariantPrice;
  const priceLabel =
    min && max && min.amount === max.amount
      ? formatMoney(min)
      : min && max
        ? `${formatMoney(min)} – ${formatMoney(max)}`
        : null;
  const currency = min?.currencyCode ?? 'USD';
  const images = product.images.nodes.length
    ? product.images.nodes
    : product.featuredImage
      ? [product.featuredImage]
      : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: images.map((i) => i.url),
    sku: firstVariant?.sku ?? undefined,
    brand: { '@type': 'Brand', name: product.vendor || 'Moon Raven Designs' },
    offers: product.variants.nodes.map((v) => ({
      '@type': 'Offer',
      sku: v.sku ?? undefined,
      price: v.price,
      priceCurrency: currency,
      availability:
        (v.inventoryQuantity ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.handle}`,
    })),
  };

  return (
    <article className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-xs eyebrow text-[var(--color-text-soft)] mb-6">
        <Link href="/" className="hover:text-[var(--color-text)]">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/collections/all" className="hover:text-[var(--color-text)]">
          Shop
        </Link>{' '}
        / <span className="text-[var(--color-text)]">{product.title}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-3">
          {images[0] ? (
            <div className="relative aspect-square bg-[var(--color-bg-soft)] overflow-hidden">
              <Image
                src={images[0].url}
                alt={images[0].altText ?? product.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover"
              />
            </div>
          ) : null}
          {images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(1, 6).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square bg-[var(--color-bg-soft)] overflow-hidden"
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? product.title}
                    fill
                    sizes="16vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="font-display text-2xl md:text-3xl uppercase tracking-[0.06em] font-bold leading-tight">
            {product.title}
          </h1>
          {priceLabel ? (
            <p className="mt-4 text-2xl text-[var(--color-text)]">{priceLabel}</p>
          ) : null}

          {product.description ? (
            <p className="mt-6 text-[var(--color-text-soft)] leading-relaxed">
              {product.description}
            </p>
          ) : null}

          <div className="mt-8">
            <a
              href={shopUrl(`/products/${product.handle}`)}
              className="btn-primary justify-center w-full md:w-auto"
            >
              {priceLabel ? `Add to cart • ${priceLabel}` : 'View on store'}
            </a>
            <p className="mt-2 text-xs text-[var(--color-text-soft)]">
              Secure checkout via Shopify at shop.moonraven.com
            </p>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-[var(--color-text-soft)]">
            <li>↻ Free 30-day returns</li>
            <li>✈ Tariff-free USA shipping (CUSMA/USMCA)</li>
            <li>♛ 1-year warranty</li>
            <li>♥ Handcrafted</li>
          </ul>

          {firstVariant?.sku ? (
            <p className="mt-6 text-xs eyebrow text-[var(--color-text-soft)]">
              SKU: {firstVariant.sku}
            </p>
          ) : null}

          {product.descriptionHtml && product.descriptionHtml !== `<p>${product.description}</p>` ? (
            <details className="mt-8 hairline pt-4">
              <summary className="eyebrow cursor-pointer">Details</summary>
              <div
                className="mt-3 text-sm text-[var(--color-text-soft)] leading-relaxed [&_p]:mb-3"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </details>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="mt-8 hairline pt-4">
              <p className="eyebrow mb-2 text-[var(--color-text-soft)]">Tags</p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs border border-[var(--color-border)] rounded-full px-3 py-1 text-[var(--color-text-soft)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
