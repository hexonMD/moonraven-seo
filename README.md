# Moon Raven Designs — SEO Frontend

Next.js 16 / App Router site at `moonraven.com`. Reads catalog from Shopify via the Admin GraphQL API; cart and checkout hand off to `shop.moonraven.com`.

## Architecture

```
moonraven.com           (Next.js — Cloudflare Pages)
  ├── /                 home
  ├── /products/[h]     product detail (SSG via generateStaticParams)
  ├── /collections/[h]  collection
  ├── /pages/[h]        static pages (about, shipping, etc.)
  ├── /blog/[h]         articles
  ├── sitemap.xml       dynamic from Shopify
  └── robots.txt
      ↓ (Shopify Admin GraphQL)
shop.moonraven.com      (Shopify storefront — cart, checkout, account)
```

Existing product URLs (`/products/<handle>`, `/collections/<handle>`) are preserved exactly. Google sees no URL change → no ranking loss.

## Local development

```bash
cp .env.example .env.local
# fill in SHOPIFY_ADMIN_TOKEN (atkn_...) — get from Shopify Dev Dashboard
npm install
npm run dev
```

Visit http://localhost:3000.

## Environment variables

| Var | Where set | Purpose |
|-----|-----------|---------|
| `SHOPIFY_STORE_DOMAIN` | Cloudflare Pages env | myshopify.com domain |
| `SHOPIFY_ADMIN_TOKEN` | Cloudflare Pages env (secret) | Admin API auth (server-side only) |
| `SHOPIFY_API_VERSION` | Cloudflare Pages env | Default `2025-07` |
| `NEXT_PUBLIC_SITE_URL` | Cloudflare Pages env | `https://moonraven.com` |
| `NEXT_PUBLIC_SHOP_URL` | Cloudflare Pages env | `https://shop.moonraven.com` (cart hand-off) |
| `SHOPIFY_APP_CLIENT_ID` | Cloudflare Pages env | Optional, for OAuth flows |
| `SHOPIFY_APP_CLIENT_SECRET` | Cloudflare Pages env (secret) | Optional, for OAuth flows |

## Deployment — Cloudflare Pages

1. Push `master` to `hexonMD/moonraven-seo`.
2. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git → pick `hexonMD/moonraven-seo`.
3. Build settings:
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Node version:** 20+ (set `NODE_VERSION=20` env if needed)
4. Add the env vars from the table above (mark `SHOPIFY_ADMIN_TOKEN` and `SHOPIFY_APP_CLIENT_SECRET` as encrypted).
5. Deploy. First build creates a `*.pages.dev` preview URL — QA there before flipping DNS.

## Custom domain

Once Cloudflare DNS is hosting `moonraven.com`:

1. Pages project → Custom domains → `moonraven.com` (Cloudflare auto-creates CNAME).
2. Also add `www.moonraven.com` (CNAME → moonraven.com).
3. `shop.moonraven.com` stays a separate CNAME → `shops.myshopify.com` (DNS only / grey cloud — Shopify needs direct routing).

## Caching & ISR

`export const revalidate = N` per page. Defaults:
- Home & collection: 30 min
- Product detail: 30 min
- Static pages: 60 min
- Sitemap: 60 min

## Sitemap

`app/sitemap.ts` is dynamic — every product + collection + page + article pulled from Shopify at revalidation time. Submit `https://moonraven.com/sitemap.xml` to Google Search Console once live.

## Design tokens

`src/app/globals.css` exposes:
- `--color-bg` (cream `#FCFBF9`), `--color-bg-soft`, `--color-text`, `--color-text-soft`
- `--color-accent` (Moon Raven tan/gold `#a89878`)
- `--color-border`, `--color-cta-bg`, `--color-cta-fg`

Fonts:
- Display: Bricolage Grotesque (all-caps headers)
- Body: DM Sans

Keep usage consistent so the site stays visually aligned with the Shopify-served `shop.moonraven.com` storefront.
