import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/ProductCard';
import { searchProductsByKeyword } from '@/lib/shopify';
import { getMemorial, MEMORIALS } from '@/lib/memorial-config';
import { getMemorialContent, getAllMemorialContentSlugs } from '@/lib/memorial-content';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export function generateStaticParams() {
  return getAllMemorialContentSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = getMemorialContent(slug);
  const memorial = getMemorial(slug);
  if (!content || !memorial) return { title: 'Not found' };

  return {
    title: content.seo_title,
    description: content.meta_description,
    alternates: { canonical: `${SITE_URL}/memorial/${slug}` },
    openGraph: {
      title: content.seo_title,
      description: content.meta_description,
      url: `${SITE_URL}/memorial/${slug}`,
      type: 'article',
    },
  };
}

export default async function MemorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = getMemorialContent(slug);
  const memorial = getMemorial(slug);
  if (!content || !memorial) notFound();

  const matchedProducts = await searchProductsByKeyword(memorial.productKeywords, 12).catch(
    () => [],
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.seo_title,
    description: content.meta_description,
    url: `${SITE_URL}/memorial/${slug}`,
    author: { '@type': 'Organization', name: 'Moon Raven Designs' },
    publisher: { '@type': 'Organization', name: 'Moon Raven Designs' },
    mainEntityOfPage: `${SITE_URL}/memorial/${slug}`,
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: content.faq.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  };

  return (
    <article className="bg-[var(--color-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {content.faq.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 py-14">
        <nav className="text-xs eyebrow text-[var(--color-text-soft)] mb-6">
          <Link href="/" className="hover:text-[var(--color-text)]">
            Home
          </Link>{' '}
          /{' '}
          <Link href="/memorial" className="hover:text-[var(--color-text)]">
            Memorial
          </Link>{' '}
          / <span className="text-[var(--color-text)]">{memorial.label}</span>
        </nav>

        <header className="mb-10 text-center">
          <p className="eyebrow text-[var(--color-accent)] mb-3">Memorial · {memorial.label}</p>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[0.06em] font-bold leading-tight">
            {content.seo_title}
          </h1>
        </header>

        <section className="text-[var(--color-text-soft)] leading-relaxed [&>p]:mb-5">
          <p className="!text-base">{content.intro}</p>

          <h2 className="font-display text-xl mt-10 mb-4 uppercase tracking-wide font-bold text-[var(--color-text)]">
            Choosing the right piece
          </h2>
          <p>{content.choosing}</p>

          <h2 className="font-display text-xl mt-10 mb-4 uppercase tracking-wide font-bold text-[var(--color-text)]">
            What the piece holds
          </h2>
          <p>{content.what_it_carries}</p>

          <h2 className="font-display text-xl mt-10 mb-4 uppercase tracking-wide font-bold text-[var(--color-text)]">
            For whom these pieces are made
          </h2>
          <p>{content.for_whom}</p>

          {content.blessing ? (
            <blockquote className="border-l-2 border-[var(--color-accent)] pl-5 mt-10 italic text-[var(--color-text)]">
              {content.blessing}
            </blockquote>
          ) : null}
        </section>
      </div>

      {matchedProducts.length > 0 ? (
        <section className="bg-[var(--color-bg-soft)] py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[0.1em] font-bold text-center mb-10">
              Memorial pieces to consider
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
              {matchedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.faq.length > 0 ? (
        <section className="mx-auto max-w-3xl px-6 py-14">
          <h2 className="font-display text-2xl uppercase tracking-[0.1em] font-bold text-center mb-8">
            Frequently asked
          </h2>
          <dl className="space-y-6">
            {content.faq.map((qa, i) => (
              <div key={i} className="hairline pb-5">
                <dt className="font-display uppercase tracking-wide font-bold text-[var(--color-text)] mb-2">
                  {qa.q}
                </dt>
                <dd className="text-[var(--color-text-soft)] leading-relaxed">{qa.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="border-t border-[var(--color-border)] py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="eyebrow text-[var(--color-text-soft)] mb-4">More memorial pages</p>
          <div className="flex flex-wrap justify-center gap-2">
            {MEMORIALS.filter((m) => m.slug !== memorial.slug)
              .slice(0, 12)
              .map((m) => (
                <Link
                  key={m.slug}
                  href={`/memorial/${m.slug}`}
                  className="text-sm border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-full px-3 py-1 text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  {m.label}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </article>
  );
}
