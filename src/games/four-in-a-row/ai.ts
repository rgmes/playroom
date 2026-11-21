// Four in a Row computer opponent. Pure: runs in a worker in the app, directly in tests.
//
// Easy:   takes a win it can see, sometimes blocks, otherwise random (centre-leaning).
// Medium: alpha-beta search, 4 moves deep.
// Hard:   alpha-beta search, 8 moves deep. Strong but beatable: it can't see deep traps.
//
// Depth is fixed (not time-based) so difficulty is the same on every device.
import type { Board, Difficulty, Player } from '../types';
import { COLS, ROWS, SIZE, currentPlayer, idx, legalColumns } from './logic';

export type Rng = () => number;

export const DEPTH: Record<Exclude<Difficulty, 'easy'>, number> = { medium: 4, hard: 8 };

const ORDER = [3, 2, 4, 1, 5, 0, 6]; // centre first: better pruning, better play
const WIN = 1_000_000;
const EMPTY = -1;

/** Every 4-cell window on the board, for the position heuristic. */
const WINDOWS: number[][] = (() => {
  const out: number[][] = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const [dr, dc] of dirs) {
        const er = r + 3 * dr;
        const ec = c + 3 * dc;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        out.push([0, 1, 2, 3].map((k) => idx(r + k * dr, c + k * dc)));
      }
  return out;
})();

/** Mutable search state: cells plus column heights, with place/undo instead of copying. */
class Search {
  cells: Int8Array;
  heights: number[];
  filled = 0;

  constructor(board: Board) {
    this.cells = new Int8Array(SIZE);
    this.heights = Array(COLS).fill(0);
    board.forEach((v, i) => {
      this.cells[i] = v === null ? EMPTY : v;
      if (v !== null) {
        this.heights[i % COLS]++;
        this.filled++;
      }
    });
  }

  canPlay(col: number) {
    return this.heights[col] < ROWS;
  }

  place(col: number, p: Player): number {
    const row = ROWS - 1 - this.heights[col];
    const i = idx(row, col);
    this.cells[i] = p;
    this.heights[col]++;
    this.filled++;
    return i;
  }

  undo(col: number) {
    this.heights[col]--;
    this.filled--;
    this.cells[idx(ROWS - 1 - this.heights[col], col)] = EMPTY;
  }

  /** Does the piece at cell i complete four? */
  wins(i: number, p: Player): boolean {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]) {
      let n = 1;
      for (let k = 1; k < 4; k++) {
        const rr = r + dr * k;
        const cc = c + dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || this.cells[idx(rr, cc)] !== p) break;
        n++;
      }
      for (let k = 1; k < 4; k++) {
        const rr = r - dr * k;
        const cc = c - dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || this.cells[idx(rr, cc)] !== p) break;
        n++;
      }
      if (n >= 4) return true;
    }
    return false;
  }

  wouldWin(col: number, p: Player): boolean {
    const i = this.place(col, p);
    const w = this.wins(i, p);
    this.undo(col);
    return w;
  }

  /** Static score from p's point of view. Symmetric, so it suits negamax. */
  evaluate(p: Player): number {
    const cells = this.cells;
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
      const v = cells[idx(r, 3)];
      if (v === p) score += 3;
      else if (v !== EMPTY) score -= 3;
    }
    for (const w of WINDOWS) {
      let mine = 0;
      let theirs = 0;
      for (const i of w) {
        const v = cells[i];
        if (v === p) mine++;
        else if (v !== EMPTY) theirs++;
      }
      if (theirs === 0) {
        if (mine === 3) score += 5;
        else if (mine === 2) score += 2;
      } else if (mine === 0) {
        if (theirs === 3) score -= 5;
        else if (theirs === 2) score -= 2;
      }
    }
    return score;
  }

  /** Negamax with alpha-beta. Assumes the previous move did not win. */
  negamax(depth: number, alpha: number, beta: number, p: Player): number {
    if (this.filled === SIZE) return 0;
    for (const col of ORDER) if (this.canPlay(col) && this.wouldWin(col, p)) return WIN + depth;
    if (depth === 0) return this.evaluate(p);
    let best = -Infinity;
    const q: Player = p === 0 ? 1 : 0;
    for (const col of ORDER) {
      if (!this.canPlay(col)) continue;
      this.place(col, p);
      const v = -this.negamax(depth - 1, -beta, -alpha, q);
      this.undo(col);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function easyMove(s: Search, legal: number[], me: Player, rng: Rng): number {
  const them: Player = me === 0 ? 1 : 0;
  const block = legal.find((c) => s.wouldWin(c, them));
  if (block !== undefined && rng() < 0.4) return block;
  // Centre-leaning random pick.
  const weights = legal.map((c) => 4 - Math.abs(3 - c));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < legal.length; k++) {
    roll -= weights[k];
    if (roll < 0) return legal[k];
  }
  return legal[legal.length - 1];
}

export function chooseMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  const legal = legalColumns(board);
  if (legal.length === 0) throw new Error('No moves left');
  const me = currentPlayer(board);
  const s = new Search(board);

  // Every level takes a win it can see.
  const win = legal.find((c) => s.wouldWin(c, me));
  if (win !== undefined) return win;

  if (difficulty === 'easy') return easyMove(s, legal, me, rng);

  const depth = DEPTH[difficulty];
  const them: Player = me === 0 ? 1 : 0;
  // Random root order: among equally good moves, the first one found is kept,
  // so the computer doesn't replay the same game every time.
  let best = -Infinity;
  let bestCol = legal[0];
  let alpha = -Infinity;
  for (const col of shuffle(legal, rng)) {
    s.place(col, me);
    const v = -s.negamax(depth - 1, -Infinity, -alpha, them);
    s.undo(col);
    if (v > best) {
      best = v;
      bestCol = col;
    }
    if (v > alpha) alpha = v;
  }
  return bestCol;
}
