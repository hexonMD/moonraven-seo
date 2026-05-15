const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? 'moonraven.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN ?? '';

if (!ADMIN_TOKEN) {
  console.warn('[shopify] SHOPIFY_ADMIN_TOKEN is not set — Shopify queries will fail');
}

const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

type GqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
  extensions?: { cost?: unknown };
};

export async function shopify<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: { revalidate?: number } = {},
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: options.revalidate ?? 60 * 15 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) {
    throw new Error('Shopify GraphQL: empty response');
  }
  return json.data;
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

export async function getActiveProducts(first = 50): Promise<Product[]> {
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first, query: "status:active", sortKey: UPDATED_AT, reverse: true) {
        nodes {
          ${PRODUCT_FIELDS}
        }
      }
    }
  `;
  const data = await shopify<{ products: { nodes: Product[] } }>(query, { first });
  return data.products.nodes;
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
