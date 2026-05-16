/**
 * Tiny shared budget tracker for the Tier 3 Gemini run.
 *
 * Gemini 2.5 Pro pricing (May 2026):
 *   - Input: $1.25 / 1M tokens (<= 200k context)
 *   - Output (incl. thoughts): $10.00 / 1M tokens
 *
 * State file: .tmp-gemini-budget.json at the repo root.
 *
 * Usage:
 *   import { addUsage, enforceCap } from './lib-budget.js';
 *   enforceCap(10); // bail if over $10
 *   const r = await gemini(...);
 *   addUsage(r.promptTokens, r.outputTokens);
 */

import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.join(process.cwd(), '.tmp-gemini-budget.json');

type State = {
  promptTokens: number;
  outputTokens: number;
  calls: number;
  costUsd: number;
};

const INPUT_PER_M = 1.25;
const OUTPUT_PER_M = 10.0;

function readState(): State {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as State;
  } catch {
    return { promptTokens: 0, outputTokens: 0, calls: 0, costUsd: 0 };
  }
}

function writeState(s: State): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + '\n');
}

export function addUsage(promptTokens: number, outputTokens: number): State {
  const s = readState();
  s.promptTokens += promptTokens;
  s.outputTokens += outputTokens;
  s.calls += 1;
  s.costUsd =
    (s.promptTokens / 1_000_000) * INPUT_PER_M + (s.outputTokens / 1_000_000) * OUTPUT_PER_M;
  writeState(s);
  return s;
}

export function getState(): State {
  return readState();
}

export function enforceCap(maxUsd: number): void {
  const s = readState();
  if (s.costUsd >= maxUsd) {
    console.error(
      `\n[budget] Spent $${s.costUsd.toFixed(3)} on Gemini (cap $${maxUsd}). Bailing.\n` +
        `  ${s.calls} calls, ${s.promptTokens} prompt tokens, ${s.outputTokens} output tokens.`,
    );
    process.exit(2);
  }
}

export function resetState(): void {
  writeState({ promptTokens: 0, outputTokens: 0, calls: 0, costUsd: 0 });
}
