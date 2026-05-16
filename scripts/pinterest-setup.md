# Pinterest Business Setup — Moon Raven Designs

15-minute checklist. Run through top to bottom. Asterisked items are the ones
that unlock revenue tracking — don't skip them.

## 1. Create the Pinterest Business account

1. Go to <https://business.pinterest.com/> and click **Sign up free**.
2. Use `craig@moonraven.com` (founder address) or whichever email is the
   canonical brand inbox. Avoid a personal address — Pinterest's account
   recovery / 2FA flow is much cleaner from a brand inbox.
3. Business name: **Moon Raven Designs**.
4. Business type: **Online Marketplace** (closest fit; "Retailer" also fine).
5. Country: **Canada** (BC). Currency: USD (your store sells in USD).
6. Skip the "Boost your idea pin reach" upsell on signup — comes later.

## 2. Claim moonraven.com domain *

This unlocks attribution (clicks back to your domain become trackable) and is
required for Rich Pins to validate. Two options — **pick one**:

### Option A — DNS TXT record (recommended; non-destructive)

1. In Pinterest: **Settings → Claimed accounts → Websites → Claim**.
2. Pinterest gives you a TXT record like `pinterest-site-verification=abc123…`.
3. Add it to Cloudflare DNS for `moonraven.com`:
   - Type: TXT
   - Name: `@` (apex)
   - Content: the verification string Pinterest gave you
   - TTL: Auto
4. Back in Pinterest, click **Verify**. Propagation usually takes &lt;5 min.

### Option B — Meta tag in theme.liquid

If you'd rather not touch DNS:

1. Pinterest gives you a tag like
   `<meta name="p:domain_verify" content="abc123...">`.
2. Add it to `layout/theme.liquid` inside `<head>` (just above our
   `<!-- pinterest-rich-pins:start -->` block). You can do this via the
   Shopify Admin → Online Store → Themes → Edit code, or by extending
   `scripts/pinterest-rich-pins.ts` with a one-line meta tag.

## 3. Validate Rich Pins *

Already done at the meta-tag layer (`scripts/pinterest-rich-pins.ts` pushed
the required `og:availability`, `og:product:retailer_item_id`,
`product:price:amount/currency`, `product:availability`, `product:condition`,
`product:brand` to product pages, and `og:type=article`, `article:*` to
`/pages/*` content pages).

To validate Pinterest sees them:

1. Go to <https://developers.pinterest.com/tools/url-debugger/>.
2. Paste any product URL, e.g.
   `https://moonraven.com/products/viper-snake-necklace-in-bronze`.
3. You should see **Product** Rich Pin detected with price, availability,
   brand.
4. Paste any pSEO URL, e.g.
   `https://moonraven.com/pages/raven-symbolism`.
5. You should see **Article** Rich Pin detected with published_time + author.

If either fails: re-run `npx tsx scripts/pinterest-rich-pins.ts` (the script
is idempotent) and wait ~5 min for Shopify's page cache to invalidate.

## 4. Install the Pinterest Tag (tracking pixel) *

The Tag pixels conversions back from your store, which is what makes
Pinterest's bidding actually work if you later run ads.

1. In Pinterest: **Ads → Conversions → Pinterest tag → Create tag**.
2. Name it `moonraven-com`. Pinterest gives you a Tag ID (a 16-digit number).
3. Two install paths — **pick the easier one for you**:

### Path A — Through the Pinterest Shopify app (recommended)

1. Install the **Pinterest** app from the Shopify App Store
   (it's free and handles both the Tag and the catalog feed).
2. During setup, the app connects to your Pinterest Business account
   via OAuth. Grant the permissions it asks for.
3. The app auto-installs the Tag and the standard events (PageView,
   AddToCart, Checkout, Purchase) using Shopify's customer events.

### Path B — Manual base code in theme.liquid

If you'd rather not install another Shopify app:

1. Copy the Pinterest base code snippet from the Tag setup screen.
   It looks like:
   ```html
   <script>!function(e){if(!window.pintrk){window.pintrk=function(){…}}}();
   pintrk('load', '2613XXXXXXXXXXXX', {em: '<user_email_address>'});
   pintrk('page');</script>
   <noscript><img height="1" width="1" style="display:none;" alt=""
     src="https://ct.pinterest.com/v3/?tid=2613XXXXXXXXXXXX&noscript=1" /></noscript>
   ```
2. Paste it into `layout/theme.liquid` just inside `<body>` (top, not
   bottom — Pinterest fires PageView immediately so it should run early).
3. For Purchase tracking, you'll separately need to add `pintrk('track',
   'checkout', {...})` to the `checkout` template — easier through the
   Shopify app.

Either way, after installation: go to **Pinterest → Ads → Conversions →
Pinterest tag** and look for the green "Receiving events" indicator within
15 minutes of a real page view.

## 5. Connect the Pinterest Feed catalog *

You already have a Shopify collection with handle `pinterest-feed` containing
235 products. Pinterest can ingest this as a catalog, which makes every product
in it eligible for free organic shopping ads in Pinterest search.

1. In Pinterest: **Ads → Catalogs → Get started**.
2. Source: **Add data source → Data feed URL**.
3. Use Shopify's collection feed URL — Shopify exposes a collection as an
   Atom feed at:
   `https://moonraven.com/collections/pinterest-feed.atom`
   (Pinterest can parse Atom; if it complains, switch to the Shopify
   Pinterest app which generates a proper Product Group feed.)
4. Schedule: **Daily** (Pinterest pulls once per 24h).
5. Once ingested, you can create Product Groups (e.g. "Sterling Silver",
   "Memorial") in Pinterest's catalog UI — these become shoppable boards.

## 6. Pre-create the six boards

Before bulk uploading, the boards must exist with these exact names (the CSV
references them):

| Board name              | What goes there                                    |
|-------------------------|----------------------------------------------------|
| Talismanic Jewelry      | General talisman / amulet / symbolic pieces        |
| Memorial Keepsakes      | Cremation jewelry, urn pendants, /pages/memorial-* |
| Wildlife Jewelry        | Raven, wolf, bear, snake, antler, horse, etc.      |
| Symbolism & Meaning     | The 11 /pages/*-symbolism pSEO pages               |
| Handcrafted Silver      | All sterling silver products + silver materials    |
| Handcrafted Bronze      | Bronze + copper products + materials pages         |

For each, set:
- **Description**: 100-200 chars, search-optimized
  (e.g. "Handcrafted sterling silver jewelry made on Vancouver Island since
  1974. Talismanic pieces with raven, wolf, skull, and feather motifs.")
- **Category**: Women's Fashion → Jewelry
- **Cover image**: pick your strongest single product photo for that theme

## 7. Bulk upload the 100 pins

Pinterest's native bulk upload via CSV is the lowest-friction option but is
limited and finicky — many marketers prefer a scheduling tool. **Two options:**

### Option A — Pinterest native bulk create (free, immediate)

1. In Pinterest: **Create → Bulk create pins**.
2. Upload `scripts/moonraven-100-pins.csv`.
3. Pinterest validates → preview screen → publish.
4. **Caveat**: Pinterest's native bulk UI sometimes truncates batches over
   50. If it does, split the CSV in half and upload each separately.

### Option B — Tailwind (recommended for ongoing cadence)

[Tailwindapp.com](https://www.tailwindapp.com/) does scheduling Pinterest
itself won't:
1. Connect Tailwind to your Pinterest Business account (OAuth).
2. Import the CSV via Tailwind's CSV uploader.
3. Set up a **5-pin/day Smart Schedule** — Tailwind picks the optimal
   posting times based on your audience's activity.
4. Cost: ~$15/mo for the starter plan. Worth it if you want hands-off.

## 8. Set the 5-pin/day organic cadence

Whichever upload tool you use, **drip-feed the 100 pins over ~20 days** rather
than posting all 100 at once. Pinterest's algorithm penalizes burst posting
("spammy patterns") and rewards consistency.

- Day 1-20: 5 pins/day from `scripts/moonraven-100-pins.csv`
- Mix: 3 product pins + 2 pSEO pins per day (helps Pinterest classify your
  account as a content+commerce hybrid, which performs better than pure
  shopping accounts in their algorithm)
- After day 20: shift to 2-3 fresh pins/day from new product launches +
  any new Tier 2 pSEO pages (gift guides, intersections, occasions)

## 9. Once-a-month maintenance

| Task                                          | Frequency    |
|-----------------------------------------------|--------------|
| Check Pinterest Analytics → Top Pins          | Weekly       |
| Re-pin best performers to additional boards   | Weekly       |
| Refresh the bulk CSV with new products        | Monthly      |
| Audit the Catalog feed for OOS / archived     | Monthly      |
| A/B test 2 pin title variants on hot products | Quarterly    |

---

## Files in this commit

- `scripts/pinterest-rich-pins.ts` — idempotent script that injects the
  Rich Pin meta tags into `layout/theme.liquid`. Re-run any time.
- `scripts/gen-pinterest-csv.ts` — generates `moonraven-100-pins.csv` from
  Shopify products + local pSEO content. Re-run monthly to refresh.
- `scripts/moonraven-100-pins.csv` — the bulk upload file (100 rows).
- `scripts/pinterest-setup.md` — this checklist.

## Won't do programmatically

- Pinterest's API requires user OAuth (no client-credentials mint),
  so the account-creation, claim, Tag install, catalog connect, and
  bulk upload steps all need Mike's hands on the Pinterest UI. The
  CSV and Rich Pin meta tags are everything we can automate.
