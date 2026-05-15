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
};

export default nextConfig;
