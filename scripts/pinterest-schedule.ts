/**
 * Pinterest auto-pin scheduler — Moon Raven Designs.
 *
 * Reads scripts/pinterest-backlog.json, finds entries where:
 *   - status === 'pending'
 *   - scheduledFor <= now
 * and posts up to MAX_PER_RUN of them. Marks each successful entry as
 * 'posted' with its returned pin id; failed entries get 'failed' status
 * + lastError + remain re-tryable on the next run.
 *
 * Intended to run once an hour (GitHub Actions cron). Default MAX_PER_RUN
 * is 2 — combined with the backlog builder's PER_DAY=4 schedule, this gives
 * us natural cadence even if a few runs miss their slot.
 *
 * Flags:
 *   --dry-run        log what would be posted; don't call Pinterest
 *   --max N          cap pins per run (default 2)
 *   --force-id ID    bypass scheduledFor check; post the named entry now
 *                    (handy for verification — Mike's first manual post)
 *   --reset-failed   set all failed entries back to 'pending' before running
 *
 * Exit codes:
 *   0   normal completion (may include partial failures)
 *   1   total scheduler failure (no backlog file, auth failure, etc.)
 *
 * IMPORTANT: this script will NEVER post pins by default in the absence of
 * a refresh_token. The pinterestFetch() helper throws an explicit error
 * with instructions when credentials are missing.
 */

import {
  createPin,
  ensureBoard,
  readBacklog,
  writeBacklog,
  type BacklogEntry,
  type Backlog,
  type PinterestBoard,
} from './pinterest-client.js';

// ─── CLI args ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(name);
const value = (name: string): string | undefined => {
  const idx = argv.indexOf(name);
  return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined;
};

const DRY_RUN = flag('--dry-run');
const MAX_PER_RUN = Math.max(1, Math.min(10, Number(value('--max') ?? '2')));
const FORCE_ID = value('--force-id');
const RESET_FAILED = flag('--reset-failed');

// ─── Helpers ────────────────────────────────────────────────────────────────

function isDue(e: BacklogEntry, now: Date): boolean {
  if (e.status !== 'pending') return false;
  return new Date(e.scheduledFor).getTime() <= now.getTime();
}

function formatDescription(e: BacklogEntry): string {
  // Append hashtags to the description, separated by spaces. Pinterest renders
  // them as clickable links inside the description body.
  const tags = e.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  if (!tags) return e.description;
  // Respect Pinterest's 500-char description ceiling.
  const merged = `${e.description}\n\n${tags}`;
  return merged.length > 500 ? merged.slice(0, 500) : merged;
}

// In-memory cache of board name → id, populated lazily as we post.
// listBoards() is a single network call regardless of board count.
const boardCache = new Map<string, PinterestBoard>();

async function resolveBoard(name: string): Promise<PinterestBoard> {
  const cached = boardCache.get(name);
  if (cached) return cached;
  const board = await ensureBoard(name, `Moon Raven Designs — ${name}`);
  boardCache.set(name, board);
  return board;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Pinterest scheduler — Moon Raven Designs ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`  max-per-run: ${MAX_PER_RUN}`);
  console.log(`  force-id: ${FORCE_ID ?? '(none)'}`);
  console.log(`  reset-failed: ${RESET_FAILED}`);
  console.log('');

  const backlog: Backlog = readBacklog();
  if (!backlog.entries.length) {
    console.log('Backlog is empty. Run `npx tsx scripts/pinterest-backlog.ts` first.');
    return;
  }

  // Optional housekeeping.
  if (RESET_FAILED) {
    let n = 0;
    for (const e of backlog.entries) {
      if (e.status === 'failed') {
        e.status = 'pending';
        e.lastError = undefined;
        n += 1;
      }
    }
    if (!DRY_RUN) writeBacklog(backlog);
    console.log(`Reset ${n} failed entries to pending`);
  }

  // Pick entries to post.
  const now = new Date();
  let candidates: BacklogEntry[];
  if (FORCE_ID) {
    const match = backlog.entries.find((e) => e.id === FORCE_ID);
    if (!match) {
      console.error(`No backlog entry with id=${FORCE_ID}`);
      process.exit(1);
    }
    if (match.status === 'posted') {
      console.error(`Entry ${FORCE_ID} is already posted (pin ${match.pinId}). Refusing.`);
      process.exit(1);
    }
    candidates = [match];
  } else {
    candidates = backlog.entries
      .filter((e) => isDue(e, now))
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, MAX_PER_RUN);
  }

  if (!candidates.length) {
    const next = backlog.entries
      .filter((e) => e.status === 'pending')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())[0];
    console.log('No pins due to post.');
    if (next) console.log(`Next pending: ${next.id} at ${next.scheduledFor}`);
    return;
  }

  console.log(`${candidates.length} candidate(s) to post:`);
  for (const e of candidates) {
    console.log(`  - ${e.id}  →  board="${e.boardName}"  scheduled=${e.scheduledFor}`);
  }
  console.log('');

  // Post each candidate. We do this serially — the per-user rate limit is
  // generous (200/hr) but Pinterest's pin-creation endpoint is the slowest
  // surface, so parallelism gains nothing.
  let posted = 0;
  let failed = 0;
  for (const entry of candidates) {
    const desc = formatDescription(entry);
    console.log(`→ ${entry.id}`);
    console.log(`  board:       ${entry.boardName}`);
    console.log(`  title:       ${entry.title}`);
    console.log(`  description: ${desc.slice(0, 80)}${desc.length > 80 ? '…' : ''}`);
    console.log(`  link:        ${entry.link}`);
    console.log(`  image:       ${entry.imageUrl}`);

    if (DRY_RUN) {
      console.log('  [DRY RUN — not posting]');
      continue;
    }

    try {
      const board = await resolveBoard(entry.boardName);
      const pin = await createPin({
        boardId: board.id,
        title: entry.title,
        description: desc,
        link: entry.link,
        imageUrl: entry.imageUrl,
        altText: entry.altText,
      });
      entry.status = 'posted';
      entry.pinId = pin.id;
      entry.postedAt = new Date().toISOString();
      entry.lastError = undefined;
      console.log(`  posted: pin id = ${pin.id}`);
      posted += 1;
      // Persist after each post — if the next post crashes we don't lose
      // the record of the previous successes.
      writeBacklog(backlog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      entry.status = 'failed';
      entry.lastError = msg.slice(0, 300);
      writeBacklog(backlog);
      console.error(`  failed: ${msg}`);
      failed += 1;
    }
  }

  console.log('');
  console.log(`Done. posted=${posted} failed=${failed} dry-run=${DRY_RUN}`);
  if (failed > 0 && posted === 0) {
    // Total failure on a non-dry run — exit non-zero so cron logs flag it.
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  console.error('Scheduler crashed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
