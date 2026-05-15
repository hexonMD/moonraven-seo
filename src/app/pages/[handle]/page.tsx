import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPageByHandle, getAllPages } from '@/lib/shopify';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export async function generateStaticParams() {
  const pages = await getAllPages().catch(() => []);
  return pages.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const page = await getPageByHandle(handle).catch(() => null);
  if (!page) return { title: 'Page not found' };

  return {
    title: page.title,
    description: page.bodySummary?.slice(0, 200) ?? '',
    alternates: { canonical: `${SITE_URL}/pages/${page.handle}` },
  };
}

export default async function StaticPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const page = await getPageByHandle(handle).catch((err: unknown) => {
    console.error('[page]', handle, err);
    return null;
  });

  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[0.06em] font-bold text-center">
        {page.title}
      </h1>
      {page.body ? (
        <div
          className="mt-8 text-[var(--color-text-soft)] leading-relaxed [&_p]:mb-4 [&_a]:text-[var(--color-accent)] [&_h2]:font-display [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-[var(--color-text)] [&_h2]:mt-8 [&_h2]:mb-3"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : null}
    </article>
  );
}
