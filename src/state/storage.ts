import { GAME_IDS, type GameId } from '../games/types';
import { MARK_SETS } from '../marks/library';
import type { AppState, Saved, Scores, Settings, Tally } from './store';

export const KEY = 'playroom:v1';
/** Saves from before Playroom, when the app was just Tic Tac Toe. */
export const LEGACY_KEY = 'tictactoe:v1';

const isTally = (t: unknown): t is Tally =>
  !!t &&
  typeof t === 'object' &&
  ['a', 'b', 'draws'].every((k) => Number.isInteger((t as Record<string, unknown>)[k]));

function readSettings(s: Record<string, unknown> | undefined): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (!s || typeof s !== 'object') return out;
  if (s.mode === 'pvp' || s.mode === 'cpu') out.mode = s.mode;
  if (s.difficulty === 'easy' || s.difficulty === 'medium' || s.difficulty === 'hard') out.difficulty = s.difficulty;
  if (s.humanSide === 0 || s.humanSide === 1) out.humanSide = s.humanSide;
  if (MARK_SETS.some((m) => m.id === s.markSetId)) out.markSetId = s.markSetId as string;
  return out;
}

function readScores(s: unknown): Partial<Scores> {
  const out: Partial<Scores> = {};
  if (!s || typeof s !== 'object') return out;
  const r = s as Record<string, unknown>;
  if (isTally(r.pvp)) out.pvp = r.pvp;
  if (isTally(r.cpu)) out.cpu = r.cpu;
  return out;
}

/** Parse saved data. Pure, so it can be tested without a browser. */
export function parse(current: string | null, legacy: string | null): Saved {
  try {
    if (current) {
      const data = JSON.parse(current);
      const scores: Saved['scores'] = {};
      for (const id of GAME_IDS) scores[id as GameId] = readScores(data?.scores?.[id]);
      return { settings: readSettings(data?.settings), scores };
    }
    // Only migrate when there is no Playroom save yet, so old data never overwrites new.
    if (legacy) {
      const data = JSON.parse(legacy);
      return { settings: readSettings(data?.settings), scores: { 'tic-tac-toe': readScores(data?.scores) } };
    }
  } catch {
    // Corrupt data: start fresh.
  }
  return {};
}

export function load(): Saved {
  try {
    return parse(localStorage.getItem(KEY), localStorage.getItem(LEGACY_KEY));
  } catch {
    return {};
  }
}

export function save(state: Pick<AppState, 'settings' | 'scores'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ settings: state.settings, scores: state.scores }));
  } catch {
    // Storage unavailable (private mode, blocked). The games still work.
  }
}
