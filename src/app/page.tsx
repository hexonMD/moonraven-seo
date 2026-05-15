import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getActiveProducts, getAllCollections } from '@/lib/shopify';

export const revalidate = 1800;

// Brand hero — pulled from the live moonraven.com production storefront
// so the home page never depends on a Shopify Admin API success to render.
const HERO_IMAGE =
  'https://cdn.shopify.com/s/files/1/0204/2526/files/IMG_8214.jpg?v=1648052681&width=1728';

export default async function HomePage() {
  const [products, collections] = await Promise.all([
    getActiveProducts(12).catch((err: unknown) => {
      console.error('[home] products', err);
      return [];
    }),
    getAllCollections(8).catch((err: unknown) => {
      console.error('[home] collections', err);
      return [];
    }),
  ]);

  return (
    <>
      <section className="relative w-full overflow-hidden bg-[var(--color-bg-soft)]">
        <div className="relative h-[70vh] min-h-[480px] max-h-[720px] w-full">
          <Image
            src={HERO_IMAGE}
            alt="Moon Raven Designs — handcrafted jewelry on Vancouver Island"
            fill
            priority
            sizes="100vw"
            unoptimized
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-6 h-full flex items-end pb-16">
            <div className="text-white max-w-lg">
              <h1 className="font-display text-5xl md:text-6xl font-bold tracking-[0.04em] uppercase leading-[1.05]">
                Wear your nature
              </h1>
              <p className="mt-3 text-white/85">
                Where wild meets refined.
              </p>
              <div className="mt-6">
                <Link href="/collections/all" className="btn-primary">
                  Explore
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-soft)] py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 32 32"
            className="mx-auto mb-4 w-7 h-7 fill-[var(--color-accent)]"
          >
            <path d="M16 2l2.6 6.4 6.4 2.6-5.2 4 1.6 6.6-5.4-3.6L10.6 22l1.6-6.6-5.2-4 6.4-2.6L16 2z" />
          </svg>
          <p className="eyebrow mb-4">Proudly created in Canada</p>
          <p className="text-[var(--color-text-soft)] leading-relaxed">
            Every piece is thoughtfully designed and made by us in Canada with care, quality, and
            attention to detail. Inspired by nature, shadow, and story, our jewelry is created
            to be meaningful, bold, and made to last — including pieces that honor what matters most.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/collections/memorial" className="btn-primary">
              Shop Memorial Jewelry
            </Link>
            <Link href="/collections/all" className="btn-outline">
              Browse All Collections
            </Link>
          </div>
        </div>
      </section>

      {collections.length > 0 ? (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[0.1em] font-bold text-center mb-10">
              Shop by collection
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {collections
                .filter((c) => c.handle !== 'frontpage' && c.handle !== 'all')
                .map((c) => {
                  const fallbackProductImage = c.products?.nodes?.[0]?.featuredImage?.url ?? null;
                  const imageUrl = c.image?.url ?? fallbackProductImage;
                  return { c, imageUrl };
                })
                .filter(({ imageUrl }) => !!imageUrl)
                .slice(0, 6)
                .map(({ c, imageUrl }) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.handle}`}
                    className="group relative aspect-[4/3] overflow-hidden bg-[var(--color-bg-soft)]"
                  >
                    <Image
                      src={imageUrl as string}
                      alt={c.image?.altText ?? c.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute left-0 bottom-0 right-0 bg-black/60 text-white p-3">
                      <p className="eyebrow !text-white">{c.title}</p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {products.length > 0 ? (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[0.1em] font-bold">
                New &amp; featured
              </h2>
              <Link
                href="/collections/all"
                className="eyebrow text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
