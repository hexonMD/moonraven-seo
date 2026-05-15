const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'michael-doyle.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET ?? '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn(
    '[shopify] SHOPIFY_APP_CLIENT_ID / SHOPIFY_APP_CLIENT_SECRET not set — Admin API calls will fail',
  );
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const TOKEN_ENDPOINT = `https://${STORE_DOMAIN}/admin/oauth/access_token`;

type TokenResponse = {
  access_token: string;
  scope: string;
  expires_in: number;
};

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;
let inflight: Promise<string> | null = null;

const TOKEN_REFRESH_SKEW_MS = 60_000;

async function mintToken(): Promise<string> {
  // 1h fetch cache: well inside the token's 24h lifetime, and lets Next.js
  // SSG product/collection pages instead of marking them dynamic.
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
    next: { revalidate: 3600, tags: ['shopify-token'] },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify token mint ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as TokenResponse;
  if (!json.access_token) {
    throw new Error('Shopify token mint: no access_token in response');
  }
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000 - TOKEN_REFRESH_SKEW_MS,
  };
  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  if (inflight) return inflight;
  inflight = mintToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

type GqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
  extensions?: { cost?: unknown };
};

// Limit concurrent Shopify requests to avoid Admin API throttling.
// Admin GraphQL costs ~2000 points/min refilled at 100/sec; with ~50-point
// queries we can sustain ~2/sec safely. 3 in flight keeps us under that.
const MAX_CONCURRENT = 3;
let inFlight = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  inFlight++;
}

function releaseSlot(): void {
  inFlight--;
  const next = waitQueue.shift();
  if (next) next();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function shopify<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: { revalidate?: number } = {},
): Promise<T> {
  await acquireSlot();
  try {
    const token = await getAccessToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: options.revalidate ?? 900 },
      });

      if (res.status === 401) {
        tokenCache = null;
        throw new Error(`Shopify 401 (token rejected) — will retry on next call`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify ${res.status}: ${body.slice(0, 500)}`);
      }

      const json = (await res.json()) as GqlResponse<T>;
      // Throttled? Backoff + retry. Cost throttling returns a 200 with errors[].
      const throttled = json.errors?.some((e) => /throttled/i.test(e.message));
      if (throttled && attempt < 4) {
        const wait = 1000 * (attempt + 1) ** 2;
        await sleep(wait);
        continue;
      }
      if (json.errors?.length) {
        throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
      }
      if (!json.data) {
        throw new Error('Shopify GraphQL: empty response');
      }
      return json.data;
    }
    throw new Error('Shopify GraphQL: exhausted retries on throttling');
  } finally {
    releaseSlot();
  }
}

export type Money = { amount: string; currencyCode: string };

export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type ProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  inventoryQuantity: number | null;
  price: string;
  compareAtPrice: string | null;
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];
  totalInventory: number | null;
  updatedAt: string;
  publishedAt: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  featuredImage: ProductImage | null;
  images: { nodes: ProductImage[] };
  variants: { nodes: ProductVariant[] };
  priceRangeV2: { minVariantPrice: Money; maxVariantPrice: Money };
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  image: ProductImage | null;
  updatedAt: string;
  products: { nodes: Product[] };
};

export type Page = {
  id: string;
  handle: string;
  title: string;
  body: string;
  bodySummary: string;
  updatedAt: string;
};

export type Article = {
  id: string;
  handle: string;
  title: string;
  body: string;
  summary: string;
  publishedAt: string | null;
  image: ProductImage | null;
  blog: { handle: string };
};

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  productType
  vendor
  tags
  totalInventory
  updatedAt
  publishedAt
  status
  featuredImage { id url altText width height }
  images(first: 10) { nodes { id url altText width height } }
  variants(first: 50) {
    nodes {
      id
      title
      sku
      inventoryQuantity
      price
      compareAtPrice
    }
  }
  priceRangeV2 {
    minVariantPrice { amount currencyCode }
    maxVariantPrice { amount currencyCode }
  }
`;

async function findOneByHandle<T extends { handle: string }>(
  type: 'products' | 'collections',
  fields: string,
  handle: string,
): Promise<T | null> {
  const query = `
    query OneByHandle($q: String!) {
      ${type}(first: 1, query: $q) {
        nodes { ${fields} }
      }
    }
  `;
  const data = await shopify<{ [K in 'products' | 'collections']?: { nodes: T[] } }>(query, {
    q: `handle:${handle}`,
  });
  const nodes = data[type]?.nodes ?? [];
  return nodes[0] ?? null;
}

const productCache = new Map<number, Promise<Product[]>>();

export async function getActiveProducts(first = 50): Promise<Product[]> {
  // Module-level memo: every page that asks for "first 250 active products"
  // gets the same in-flight promise, so a build with N symbolism pages
  // only fires one Shopify request instead of N.
  const cached = productCache.get(first);
  if (cached) return cached;
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
        nodes {
          ${PRODUCT_FIELDS}
        }
      }
    }
  `;
  const promise = shopify<{ products: { nodes: Product[] } }>(query, { first }).then(
    (data) => data.products.nodes,
  );
  productCache.set(first, promise);
  // Eject failed promises so retries don't get stuck on a rejection.
  promise.catch(() => productCache.delete(first));
  return promise;
}

type HandlePageResponse = {
  products?: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { handle: string }[] };
  collections?: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { handle: string }[] };
};

export async function getAllProductHandles(): Promise<string[]> {
  const handles: string[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const query = `
      query ProductHandles($cursor: String) {
        products(first: 250, after: $cursor, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          nodes { handle }
        }
      }
    `;
    const data: HandlePageResponse = await shopify<HandlePageResponse>(query, { cursor });
    const page = data.products;
    if (!page) break;
    handles.push(...page.nodes.map((n) => n.handle));
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return handles;
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  return findOneByHandle<Product>('products', PRODUCT_FIELDS, handle);
}

export async function getAllCollectionHandles(): Promise<string[]> {
  const handles: string[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 20; i++) {
    const query = `
      query CollectionHandles($cursor: String) {
        collections(first: 250, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes { handle }
        }
      }
    `;
    const data: HandlePageResponse = await shopify<HandlePageResponse>(query, { cursor });
    const page = data.collections;
    if (!page) break;
    handles.push(...page.nodes.map((n) => n.handle));
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return handles;
}

const COLLECTION_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  image { id url altText width height }
  updatedAt
  products(first: 60) {
    nodes {
      ${PRODUCT_FIELDS}
    }
  }
`;

export async function getCollectionByHandle(handle: string): Promise<Collection | null> {
  return findOneByHandle<Collection>('collections', COLLECTION_FIELDS, handle);
}

export async function getAllCollections(first = 50): Promise<Collection[]> {
  const query = `
    query Collections($first: Int!) {
      collections(first: $first, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          description
          descriptionHtml
          image { id url altText width height }
          updatedAt
          products(first: 1) { nodes { id handle title description descriptionHtml productType vendor tags totalInventory updatedAt publishedAt status featuredImage { id url altText width height } images(first: 1) { nodes { id url altText width height } } variants(first: 1) { nodes { id title sku inventoryQuantity price compareAtPrice } } priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } } } }
        }
      }
    }
  `;
  const data = await shopify<{ collections: { nodes: Collection[] } }>(query, { first });
  return data.collections.nodes;
}

export async function getPageByHandle(handle: string): Promise<Page | null> {
  const query = `
    query PageByHandle($handle: String!) {
      pages(first: 1, query: $handle) {
        nodes { id handle title body bodySummary updatedAt }
      }
    }
  `;
  const data = await shopify<{ pages: { nodes: Page[] } }>(query, { handle: `handle:${handle}` });
  return data.pages.nodes[0] ?? null;
}

export async function getAllPages(): Promise<Page[]> {
  const query = `
    query AllPages {
      pages(first: 100) {
        nodes { id handle title body bodySummary updatedAt }
      }
    }
  `;
  const data = await shopify<{ pages: { nodes: Page[] } }>(query);
  return data.pages.nodes;
}

export async function searchProductsByKeyword(keywords: string[], first = 12): Promise<Product[]> {
  // Moonraven's catalog has aggressive brand-spam tags: every product carries
  // tags like 'raven jewelry', 'raven skull', 'MoonRavenDesigns'. So neither
  // title-substring nor broad tag matching is precise — they match the whole
  // catalog. Strategy: pull a generous candidate set via tag:keyword (exact),
  // then post-filter by the product-name prefix (the portion before " – " or
  // " | " in the title — Moonraven titles all follow "Name – brand suffix").
  const clauses = keywords.flatMap((k) => [`tag:${k}`]);
  const q = `status:active AND (${clauses.join(' OR ')})`;
  const query = `
    query SearchProducts($q: String!, $first: Int!) {
      products(first: $first, query: $q, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          ${PRODUCT_FIELDS}
        }
      }
    }
  `;
  const data = await shopify<{ products: { nodes: Product[] } }>(query, {
    q,
    first: Math.max(first * 6, 60),
  });

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const filtered = data.products.nodes.filter((p) => {
    // Take the part of the title before any " – ", " — ", or " | " separator —
    // that's the actual product name, before the brand/descriptive suffix.
    // Moonraven titles use mixed separators: en-dash "–", em-dash "—",
    // pipe "|", or a regular hyphen "-" with surrounding spaces. Split on
    // any of those.
    const productName = p.title.split(/\s[-–—|]\s/)[0]?.toLowerCase() ?? '';
    return lowerKeywords.some((k) => productName.includes(k));
  });
  return filtered.slice(0, first);
}

export async function getAllArticles(): Promise<Article[]> {
  const query = `
    query AllArticles {
      articles(first: 100, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          body
          summary
          publishedAt
          image { id url altText width height }
          blog { handle }
        }
      }
    }
  `;
  const data = await shopify<{ articles: { nodes: Article[] } }>(query);
  return data.articles.nodes;
}

export function formatMoney(money: Money): string {
  const amount = Number(money.amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: money.currencyCode,
    }).format(amount);
  } catch {
    return `${money.currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatVariantPrice(price: string, currency: string): string {
  return formatMoney({ amount: price, currencyCode: currency });
}

export function shopUrl(path = ''): string {
  const base = process.env.NEXT_PUBLIC_SHOP_URL ?? 'https://shop.moonraven.com';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
