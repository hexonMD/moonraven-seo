import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="eyebrow text-[var(--color-accent)]">404</p>
      <h1 className="mt-3 font-display text-3xl md:text-4xl uppercase tracking-[0.06em] font-bold">
        We can&apos;t find that piece
      </h1>
      <p className="mt-3 text-[var(--color-text-soft)]">
        The page you&apos;re looking for has been moved, archived, or was never here.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/collections/all" className="btn-outline">
          Browse the collection
        </Link>
      </div>
    </div>
  );
}
