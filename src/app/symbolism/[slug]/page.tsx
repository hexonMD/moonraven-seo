import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/ProductCard';
import { searchProductsByKeyword } from '@/lib/shopify';
import { getSymbol, SYMBOLS } from '@/lib/symbolism-config';
import { getSymbolContent, getAllSymbolContentSlugs } from '@/lib/symbolism-content';

export const revalidate = 3600;
export const dynamicParams = false;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export function generateStaticParams() {
  return getAllSymbolContentSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = getSymbolContent(slug);
  const symbol = getSymbol(slug);
  if (!content || !symbol) return { title: 'Not found' };

  return {
    title: content.seo_title,
    description: content.meta_description,
    alternates: { canonical: `${SITE_URL}/symbolism/${slug}` },
    openGraph: {
      title: content.seo_title,
      description: content.meta_description,
      url: `${SITE_URL}/symbolism/${slug}`,
      type: 'article',
    },
  };
}

export default async function SymbolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = getSymbolContent(slug);
  const symbol = getSymbol(slug);
  if (!content || !symbol) notFound();

  const matchedProducts = await searchProductsByKeyword(symbol.matchTerms, 12).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.seo_title,
    description: content.meta_description,
    url: `${SITE_URL}/symbolism/${slug}`,
    author: { '@type': 'Organization', name: 'Moon Raven Designs' },
    publisher: { '@type': 'Organization', name: 'Moon Raven Designs' },
    mainEntityOfPage: `${SITE_URL}/symbolism/${slug}`,
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
          <Link href="/symbolism" className="hover:text-[var(--color-text)]">
            Symbolism
          </Link>{' '}
          / <span className="text-[var(--color-text)]">{symbol.label}</span>
        </nav>

        <header className="mb-10 text-center">
          <p className="eyebrow text-[var(--color-accent)] mb-3">Symbolism · {symbol.label}</p>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[0.06em] font-bold leading-tight">
            {content.seo_title}
          </h1>
        </header>

        <section className="prose prose-neutral max-w-none text-[var(--color-text-soft)] leading-relaxed [&_p]:mb-5 [&_h2]:font-display [&_h2]:text-[var(--color-text)] [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-bold">
          <p>{content.intro}</p>

          <h2>Meaning</h2>
          <p>{content.meaning}</p>

          <h2>In jewelry</h2>
          <p>{content.in_jewelry}</p>

          <h2>How to wear it</h2>
          <p>{content.how_to_wear}</p>
        </section>
      </div>

      {matchedProducts.length > 0 ? (
        <section className="bg-[var(--color-bg-soft)] py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[0.1em] font-bold text-center mb-10">
              {symbol.label} pieces
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
          <p className="eyebrow text-[var(--color-text-soft)] mb-4">More symbols</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SYMBOLS.filter((s) => s.slug !== symbol.slug)
              .slice(0, 8)
              .map((s) => (
                <Link
                  key={s.slug}
                  href={`/symbolism/${s.slug}`}
                  className="text-sm border border-[var(--color-border)] hover:border-[var(--color-accent)] rounded-full px-4 py-1.5 text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
                >
                  {s.label}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </article>
  );
}
