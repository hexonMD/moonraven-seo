import Link from 'next/link';
import type { Metadata } from 'next';
import { SYMBOLS } from '@/lib/symbolism-config';
import { getAllSymbolContentSlugs } from '@/lib/symbolism-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export const metadata: Metadata = {
  title: 'Symbolism — Meaning Behind Each Piece',
  description:
    'A reading of the symbols we work in metal: raven, skull, antler, snake, feather, and more. Their meaning in jewelry and how to wear them.',
  alternates: { canonical: `${SITE_URL}/symbolism` },
};

export default function SymbolismIndex() {
  const published = new Set(getAllSymbolContentSlugs());
  const visible = SYMBOLS.filter((s) => published.has(s.slug));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <header className="text-center mb-12">
        <p className="eyebrow text-[var(--color-accent)] mb-3">Symbolism</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold">
          The meaning behind each piece
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-[var(--color-text-soft)]">
          Every symbol we work in metal has a history, a meaning, and a way it tends to find the person it belongs to. These are short readings of the ones that recur most in our work.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visible.map((s) => (
          <Link
            key={s.slug}
            href={`/symbolism/${s.slug}`}
            className="block border border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent)] transition bg-white"
          >
            <p className="eyebrow mb-2">{s.label}</p>
            <p className="font-display text-xl font-bold tracking-wide uppercase">
              {s.title.replace(' Symbolism in Jewelry', '')}
            </p>
            <p className="mt-3 text-sm text-[var(--color-text-soft)] leading-relaxed">{s.hook}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
