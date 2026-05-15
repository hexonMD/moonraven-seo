import type { Metadata } from 'next';
import './globals.css';
import { getShopifyShell } from '@/lib/shopify-shell';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moonraven.com';

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shell = await getShopifyShell();
  return (
    <html lang="en">
      <head>
        {shell.headExtras ? (
          <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: shell.headExtras }} />
        ) : null}
      </head>
      <body className={shell.bodyClass || ''}>
        {shell.header ? (
          <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: shell.header }} />
        ) : null}
        <main role="main" className="mx-auto">
          {children}
        </main>
        {shell.footer ? (
          <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: shell.footer }} />
        ) : null}
      </body>
    </html>
  );
}
