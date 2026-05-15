import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '**.shopify.com' },
    ],
    // Cloudflare Workers don't bundle Next.js's image optimizer by default,
    // so optimized URLs 404 in production. Skip the optimizer — Shopify CDN
    // already serves correctly-sized images, and we pass `width` params in
    // src URLs where it matters.
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['next/font'],
  },
  // Hybrid routing: pSEO routes render via Next.js, everything else falls
  // through to the existing Shopify store. This is what lets us put new
  // SEO surfaces on moonraven.com without disturbing the existing theme.
  async rewrites() {
    return {
      // Run before filesystem routing — explicitly proxy the home (Next has
      // no page.tsx for `/`, but fallback rewrites don't seem to fire for
      // the home cleanly via the OpenNext adapter).
      beforeFiles: [
        {
          source: '/',
          destination: 'https://michael-doyle.myshopify.com/',
        },
      ],
      afterFiles: [],
      // Catch every other unmatched path.
      fallback: [
        {
          source: '/:path*',
          destination: 'https://michael-doyle.myshopify.com/:path*',
        },
      ],
    };
  },
};

export default nextConfig;

// CF auto-injects this. Local `npm run build` will TS-error since the
// package isn't installed locally — that's expected; only the CF build
// matters here.
import('@opennextjs/cloudflare')
  .then((m) => m.initOpenNextCloudflareForDev())
  .catch(() => undefined);
