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
      beforeFiles: [],
      afterFiles: [],
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

// CF auto-injects this; swallow the error when the package isn't installed
// locally so `npm run build` works for sanity-checks outside the deploy path.
// @ts-expect-error — module only present in CF build env
import('@opennextjs/cloudflare')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .then((m: any) => m.initOpenNextCloudflareForDev())
  .catch(() => undefined);
