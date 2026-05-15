/**
 * Fetches Shopify's home page HTML and extracts the chrome (head links/styles,
 * <header>, <footer>) so the Next.js pSEO pages can render *inside* the real
 * Shopify Broadcast theme.
 *
 * Cached for 1h via fetch's `next.revalidate` — every theme change goes live
 * on the pSEO pages within an hour without code changes.
 */

const SHOPIFY_HOME = 'https://michael-doyle.myshopify.com/';

export type ShopifyShell = {
  // <link rel="stylesheet">, <link rel="preconnect">, <style>, <script>
  // tags from the original <head> we want to mirror.
  headExtras: string;
  // Full <header>...</header> block from Shopify (theme nav, search, cart).
  header: string;
  // Full <footer>...</footer> block from Shopify (newsletter, columns).
  footer: string;
  // Body opening tag's class list (Shopify themes attach class hooks to body).
  bodyClass: string;
};

const FALLBACK: ShopifyShell = {
  headExtras: '',
  header: '',
  footer: '',
  bodyClass: '',
};

function extractBetween(html: string, openRe: RegExp, closeTag: string): string {
  const m = openRe.exec(html);
  if (!m) return '';
  const start = m.index;
  const closeIdx = html.indexOf(closeTag, start + m[0].length);
  if (closeIdx === -1) return '';
  return html.slice(start, closeIdx + closeTag.length);
}

function extractHeadExtras(headHtml: string): string {
  // Pull <link rel="stylesheet">, <link rel="preconnect">, <style>, <script src=...>
  // and CSS @font-face <style data-shopify> blocks.
  const tags: string[] = [];
  const linkRe = /<link\s+[^>]*rel="(stylesheet|preconnect|preload|dns-prefetch)"[^>]*\/?>/gi;
  const scriptRe = /<script[^>]*src="[^"]+"[^>]*><\/script>/gi;
  const styleRe = /<style[^>]*>[\s\S]*?<\/style>/gi;
  for (const m of headHtml.matchAll(linkRe)) tags.push(m[0]);
  for (const m of headHtml.matchAll(scriptRe)) tags.push(m[0]);
  for (const m of headHtml.matchAll(styleRe)) tags.push(m[0]);
  return tags.join('\n');
}

export async function getShopifyShell(): Promise<ShopifyShell> {
  try {
    const res = await fetch(SHOPIFY_HOME, {
      next: { revalidate: 3600, tags: ['shopify-shell'] },
      headers: {
        // Pretend to be a regular browser request so Shopify returns the
        // standard storefront HTML rather than some bot-deflection variant.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return FALLBACK;
    const html = await res.text();

    // Body class — Shopify themes hook layout JS off classes on <body>.
    const bodyMatch = /<body[^>]*class="([^"]*)"[^>]*>/i.exec(html);
    const bodyClass = bodyMatch?.[1] ?? '';

    // Pull head content (between <head> and </head>).
    const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
    const headExtras = headMatch ? extractHeadExtras(headMatch[1]) : '';

    // Main <header> (theme nav). The Broadcast theme uses a top-level <header>
    // that wraps the announcement bar + site header. Some themes have multiple
    // <header> tags (e.g. inside drawers); we want the first one.
    const header = extractBetween(html, /<header(?![^>]*class=["']drawer)[^>]*>/i, '</header>');

    // Footer
    const footer = extractBetween(html, /<footer[^>]*class="footer-sections/i, '</footer>');

    return { headExtras, header, footer, bodyClass };
  } catch {
    return FALLBACK;
  }
}
