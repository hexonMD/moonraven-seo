import Link from 'next/link';
import type { Metadata } from 'next';
import { MATERIALS } from '@/lib/materials-config';
import { getAllMaterialContentSlugs } from '@/lib/materials-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export const metadata: Metadata = {
  title: 'Materials — Sterling Silver, Bronze, Copper',
  description:
    'A reading of the metals we work in — sterling silver, oxidized bronze, solid bronze, white bronze, copper. Properties, care, and which suits your hand.',
  alternates: { canonical: `${SITE_URL}/materials` },
};

export default function MaterialsIndex() {
  const published = new Set(getAllMaterialContentSlugs());
  const visible = MATERIALS.filter((m) => published.has(m.slug));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <header className="text-center mb-12">
        <p className="eyebrow text-[var(--color-accent)] mb-3">Materials</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold">
          The metals we work in
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-[var(--color-text-soft)]">
          Each metal behaves differently — different weight, different patina, different relationship to your skin over time. Choose the one that suits the piece and the wearer.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((m) => (
          <Link
            key={m.slug}
            href={`/materials/${m.slug}`}
            className="block border border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent)] transition bg-white"
          >
            <p className="font-display text-xl font-bold tracking-wide uppercase">{m.label}</p>
            <p className="mt-3 text-sm text-[var(--color-text-soft)] leading-relaxed">{m.hook}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
