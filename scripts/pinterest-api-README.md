# Pinterest API v5 — Moon Raven auto-pin pipeline

Four TypeScript scripts that authenticate to Pinterest once, then auto-post
pins from Shopify products and pSEO pages on a daily schedule.

```
scripts/
  pinterest-client.ts        # OAuth + token persistence + pinterestFetch() helper
  pinterest-oauth-init.ts    # one-shot: consent flow → refresh_token saved to .env.pinterest
  pinterest-backlog.ts       # Shopify + pSEO → scripts/pinterest-backlog.json
  pinterest-schedule.ts      # cron-runner: posts pins whose scheduledFor is past
  pinterest-backlog.json     # generated; gitignored via .env* + scripts/.gitignore
.github/workflows/
  pinterest-schedule.yml     # hourly GitHub Actions cron
.env.pinterest               # generated; gitignored via .env* rule
```

This pipeline does **not** overlap with the rich-pin meta tag work
(`scripts/pinterest-rich-pins.ts`), the bulk CSV (`scripts/moonraven-100-pins.csv`),
or the account setup checklist (`scripts/pinterest-setup.md`).

---

## Setup

### Step 1 — Create a Pinterest app

1. Sign in at **<https://developers.pinterest.com/apps/>** with the Moon Raven
   Pinterest business account.
2. Click **Connect app**.
3. App details:
   - **App name**: `Moon Raven Auto Pin`
   - **Description**: `Automated daily pin publishing for moonraven.com.`
   - **App contact**: your email.
   - **Privacy policy URL**: `https://moonraven.com/policies/privacy-policy`
4. After submission you'll see **App ID** and **App secret link** — copy
   both. Treat the secret like a password.
5. Open the app's **Configure** tab → set the **Redirect URI** to:
   ```
   http://localhost:8765/callback
   ```
   This must match exactly. The init script runs a listener on `:8765`.
6. Under **Scopes**, request: `boards:read`, `boards:write`, `pins:read`, `pins:write`.

Pinterest's standard tier is auto-approved for these scopes — no manual review
needed for posting to your own boards. (You only need Trial/Standard review if
you want to *read* other users' data, which we don't.)

### Step 2 — One-time OAuth consent

From the repo root, on a machine with a browser:

```bash
npx tsx scripts/pinterest-oauth-init.ts
```

The script:

1. Prompts for `PINTEREST_APP_ID` and `PINTEREST_APP_SECRET` (or reads them
   from `process.env`).
2. Saves them, plus the redirect URI, to `.env.pinterest`.
3. Prints a consent URL like:
   ```
   https://www.pinterest.com/oauth/?client_id=…&redirect_uri=http%3A%2F%2Flocalhost%3A8765%2Fcallback&response_type=code&scope=boards%3Aread%2Cboards%3Awrite%2Cpins%3Aread%2Cpins%3Awrite&state=…
   ```
4. Listens on `http://localhost:8765/callback` for the redirect-back.
5. Open the URL → click **Continue** on Pinterest's consent screen → you're
   bounced back to `localhost:8765` with a `code=…` param.
6. The script exchanges that code for `access_token` + `refresh_token` and
   saves both to `.env.pinterest`.
7. Finally it calls `listBoards()` to verify and prints the boards already
   on the account.

`.env.pinterest` is gitignored via the existing `.env*` rule.

### Step 3 — Build the backlog

```bash
SHOPIFY_APP_CLIENT_ID=… SHOPIFY_APP_CLIENT_SECRET=… \
  npx tsx scripts/pinterest-backlog.ts
```

This:

- Fetches all `status:active` Shopify products via Admin GraphQL.
- For each product → builds a `BacklogEntry` (title ≤ 100, description ≤ 500,
  ending with a rotating soft CTA, 4-6 hashtags, board chosen by symbol/material).
- Adds one entry per pSEO page (symbolism, memorial, material), with a
  fallback image picked from the first matching product.
- Schedules entries 4/day starting tomorrow at 10:00 local time.
- Writes `scripts/pinterest-backlog.json`.

Flags:

| Flag | Effect |
|------|--------|
| `--limit 20` | only first 20 products (testing) |
| `--per-day 3` | space pins differently (default 4) |
| `--start 2026-05-20T10:00:00-07:00` | override start time |
| `--pseo-only` | skip products |
| `--products-only` | skip pSEO |
| `--merge` | append to existing backlog instead of overwriting |

Review the JSON before scheduling. Edit any title / description / scheduledFor
by hand if you want to override the templates.

### Step 4 — Dry-run the scheduler

```bash
npx tsx scripts/pinterest-schedule.ts --dry-run
```

Prints what would be posted right now, without calling Pinterest. The dry-run
flag is set by default in all our shipping examples — **the agent that built
this pipeline never posted a real pin**. Mike posts the first one by hand:

```bash
# Real first post — pick a single entry id from the backlog
npx tsx scripts/pinterest-schedule.ts --force-id product:raven-vertebra-ring
```

Then check it on pinterest.com/moonravendesigns. Once you trust the output,
unleash the cron.

### Step 5 — Schedule via GitHub Actions

`.github/workflows/pinterest-schedule.yml` runs every hour. Required repo
secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `PINTEREST_APP_ID` | from Step 1 |
| `PINTEREST_APP_SECRET` | from Step 1 |
| `PINTEREST_REFRESH_TOKEN` | from `.env.pinterest` after Step 2 |

Optional:

| Secret | Value | Purpose |
|--------|-------|---------|
| `PINTEREST_REDIRECT_URI` | `http://localhost:8765/callback` | only used by init |
| `PINTEREST_AUTO_ROTATE_SECRET` | a GitHub PAT with `Secrets: write` | auto-rotate the refresh_token if Pinterest issues a new one |

To trigger a run by hand: **Actions → Pinterest auto-pin → Run workflow**.
You can pick `dry_run=true` from the UI to test without posting.

---

## Daily operations

- **Re-seed the backlog after adding new products**:
  ```bash
  npx tsx scripts/pinterest-backlog.ts --merge
  ```
  `--merge` keeps existing entries and only adds entries with new ids.

- **Edit a single entry by hand**: open `scripts/pinterest-backlog.json`,
  change title/description/scheduledFor, save. Next cron run picks it up.

- **Reset failed entries** (e.g. after fixing a bad image URL):
  ```bash
  npx tsx scripts/pinterest-schedule.ts --reset-failed --dry-run
  ```

- **Pause posting** without losing the backlog: disable the workflow in
  the Actions tab, or set every `pending` entry's `scheduledFor` far in the future.

---

## How tokens stay valid

- The consent flow returns a `refresh_token` valid for ~1 year.
- `pinterestFetch()` caches the `access_token` (60-min life) in `.env.pinterest`
  and refreshes it on demand when it has < 60 s left.
- If Pinterest rotates the `refresh_token` on refresh (some apps do), the
  client persists the new value automatically. The optional rotation step
  in the GitHub Action propagates it back to the encrypted repo secret.

If a 401 ever sneaks past the expiry check, the helper refreshes once and
retries the request. If both fail, you'll see a clear error and need to
re-run `pinterest-oauth-init.ts`.

---

## Files at a glance

- **pinterest-client.ts** — no side effects on import. Exports
  `pinterestFetch()`, `listBoards()`, `createPin()`, `ensureBoard()`,
  token persistence helpers, and the `BacklogEntry` / `Backlog` types.
- **pinterest-oauth-init.ts** — interactive. Runs a one-shot `http` server
  on `:8765`, captures the auth code, exchanges it.
- **pinterest-backlog.ts** — pure JSON producer. Never calls Pinterest.
- **pinterest-schedule.ts** — only script that posts. Default is conservative
  (max 2/run). `--dry-run` does no network writes to Pinterest at all.
