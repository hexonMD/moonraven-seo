import Link from 'next/link';
import type { Metadata } from 'next';
import { MEMORIALS } from '@/lib/memorial-config';
import { getAllMemorialContentSlugs } from '@/lib/memorial-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

export const metadata: Metadata = {
  title: 'Memorial Jewelry by Loss Type',
  description:
    'Memorial jewelry and cremation pendants chosen with care, sized for the specific grief — for the loss of a parent, partner, child, sibling, pet.',
  alternates: { canonical: `${SITE_URL}/memorial` },
};

export default function MemorialIndex() {
  const published = new Set(getAllMemorialContentSlugs());
  const visible = MEMORIALS.filter((m) => published.has(m.slug));
  const human = visible.filter((m) => m.kind === 'human');
  const pets = visible.filter((m) => m.kind === 'pet');

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <header className="text-center mb-12">
        <p className="eyebrow text-[var(--color-accent)] mb-3">Memorial</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[0.06em] font-bold">
          For the people, the animals, and the absences they leave
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-[var(--color-text-soft)]">
          Memorial jewelry sized for a particular loss. Each page is a quiet starting point — for choosing a piece, deciding whether to include ash or just memory, and finding the shape of what to carry forward.
        </p>
      </header>

      {human.length > 0 ? (
        <section className="mb-14">
          <h2 className="eyebrow mb-6">For people</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {human.map((m) => (
              <Link
                key={m.slug}
                href={`/memorial/${m.slug}`}
                className="block border border-[var(--color-border)] rounded-lg p-5 hover:border-[var(--color-accent)] transition bg-white"
              >
                <p className="font-display text-lg font-bold tracking-wide uppercase">{m.label}</p>
                <p className="mt-2 text-sm text-[var(--color-text-soft)] leading-relaxed">
                  {m.hook}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {pets.length > 0 ? (
        <section>
          <h2 className="eyebrow mb-6">For pets</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((m) => (
              <Link
                key={m.slug}
                href={`/memorial/${m.slug}`}
                className="block border border-[var(--color-border)] rounded-lg p-5 hover:border-[var(--color-accent)] transition bg-white"
              >
                <p className="font-display text-lg font-bold tracking-wide uppercase">
                  {m.label.replace('Pet — ', '')}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-soft)] leading-relaxed">
                  {m.hook}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
