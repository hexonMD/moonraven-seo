import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '700'],
});

const LOGO_URL =
  'https://cdn.shopify.com/s/files/1/0204/2526/files/MR_Logo3_Left_BLK_418c00c4-d468-41d9-ba8e-a5c938777ed2.png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';
const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? 'https://shop.moonraven.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Moon Raven Designs | Handcrafted Jewelry & Talismans',
    template: '%s · Moon Raven Designs',
  },
  description:
    'Handcrafted jewelry and meaningful talismans, made by hand in Victoria, BC since 1974. Norse symbols, memorial pieces, and signature collections.',
  openGraph: {
    type: 'website',
    siteName: 'Moon Raven Designs',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <div className="bg-[var(--color-accent)] text-white text-xs tracking-wide text-center py-2 px-4">
          Free U.S. shipping &nbsp;•&nbsp; Tariff-free U.S. checkout &nbsp;•&nbsp; International flat rate $12 &nbsp;•&nbsp; Handcrafted in Canada since 1974
        </div>

        <header className="bg-[var(--color-bg)] hairline">
          <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src={LOGO_URL}
                alt="Moon Raven Designs"
                width={210}
                height={56}
                priority
                unoptimized
                className="h-10 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-8 eyebrow">
              <Link href="/collections/all" className="hover:text-[var(--color-accent)]">
                Shop
              </Link>
              <Link href="/collections/memorial" className="hover:text-[var(--color-accent)]">
                Memorial
              </Link>
              <Link href="/collections/all" className="hover:text-[var(--color-accent)]">
                Collections
              </Link>
              <Link href="/pages/about" className="hover:text-[var(--color-accent)]">
                Our Story
              </Link>
            </nav>
            <a
              href={`${SHOP_URL}/cart`}
              className="eyebrow border border-[var(--color-border)] rounded-full px-3 py-1 hover:border-[var(--color-accent)]"
            >
              Cart
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-[var(--color-bg-soft)] mt-20">
          <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 md:grid-cols-4 text-sm">
            <div>
              <p className="eyebrow mb-3">About the brand</p>
              <p className="text-[var(--color-text-soft)] leading-relaxed">
                Handcrafted in Victoria, BC since 1974. We create meaningful jewelry for the untamed spirit — from Norse symbols of protection to memorial pieces that keep loved ones close. Every piece is made by hand with intention.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3">Customer Care</p>
              <ul className="space-y-2 text-[var(--color-text-soft)]">
                <li><Link href="/pages/contact" className="hover:text-[var(--color-text)]">Contact Us</Link></li>
                <li><Link href="/pages/shipping" className="hover:text-[var(--color-text)]">Shipping &amp; Returns</Link></li>
                <li><Link href="/pages/sizing-guide" className="hover:text-[var(--color-text)]">Sizing Guide</Link></li>
                <li><Link href="/pages/wholesale" className="hover:text-[var(--color-text)]">Wholesale Inquiries</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3">Resources</p>
              <ul className="space-y-2 text-[var(--color-text-soft)]">
                <li><Link href="/pages/about" className="hover:text-[var(--color-text)]">Our Story</Link></li>
                <li><Link href="/pages/care-instructions" className="hover:text-[var(--color-text)]">Care Instructions</Link></li>
                <li><a href={`${SHOP_URL}/account`} className="hover:text-[var(--color-text)]">Account</a></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3">Stay in Touch</p>
              <p className="text-[var(--color-text-soft)] mb-4">
                Subscribe for 10% off your first order, plus early access to new collections.
              </p>
              <a
                href={`${SHOP_URL}/account/register`}
                className="btn-outline w-full justify-center"
              >
                Join the newsletter
              </a>
            </div>
          </div>
          <div className="hairline">
            <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-[var(--color-text-soft)] flex justify-between">
              <span>© Moon Raven Designs {new Date().getFullYear()}</span>
              <span>Handcrafted in Canada</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
