// Four in a Row rules. Pure: no React, no DOM.
// Board is 7 columns x 6 rows, stored row-major with row 0 at the TOP: index = row * COLS + col.
import type { Board, Cell, Outcome, Player, Rules } from '../types';

export const COLS = 7;
export const ROWS = 6;
export const SIZE = COLS * ROWS;

export const idx = (row: number, col: number) => row * COLS + col;
export const rowOf = (i: number) => Math.floor(i / COLS);
export const colOf = (i: number) => i % COLS;
/** Row counted from the bottom, 1-based, as players say it. */
export const rowFromBottom = (i: number) => ROWS - rowOf(i);

export const emptyBoard = (): Cell[] => Array<Cell>(SIZE).fill(null);

export function currentPlayer(board: Board): Player {
  let filled = 0;
  for (const c of board) if (c !== null) filled++;
  return (filled % 2) as Player;
}

/** The row a piece dropped in `col` would land in, or -1 if the column is full. */
export function landingRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[idx(r, col)] === null) return r;
  return -1;
}

export const isColumnFull = (board: Board, col: number) => board[idx(0, col)] !== null;

export function legalColumns(board: Board): number[] {
  const out: number[] = [];
  for (let c = 0; c < COLS; c++) if (!isColumnFull(board, c)) out.push(c);
  return out;
}

const DIRS: [number, number][] = [
  [0, 1], // across
  [1, 0], // down
  [1, 1], // diagonal down-right
  [1, -1], // diagonal down-left
];

const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

/** Every run of 4+ for any player. Each run is listed once, from its first cell. */
export function findRuns(board: Board): { player: Player; cells: number[] }[] {
  const runs: { player: Player; cells: number[] }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[idx(r, c)];
      if (p === null) continue;
      for (const [dr, dc] of DIRS) {
        // Only start counting at the beginning of a run.
        const pr = r - dr;
        const pc = c - dc;
        if (inside(pr, pc) && board[idx(pr, pc)] === p) continue;
        const cells: number[] = [];
        let rr = r;
        let cc = c;
        while (inside(rr, cc) && board[idx(rr, cc)] === p) {
          cells.push(idx(rr, cc));
          rr += dr;
          cc += dc;
        }
        if (cells.length >= 4) runs.push({ player: p, cells });
      }
    }
  }
  return runs;
}

export function outcome(board: Board): Outcome {
  const runs = findRuns(board);
  if (runs.length) {
    const player = runs[0].player;
    const mine = runs.filter((r) => r.player === player);
    const cells = [...new Set(mine.flatMap((r) => r.cells))];
    const lines = mine.map((r) => [r.cells[0], r.cells[r.cells.length - 1]] as [number, number]);
    return { kind: 'win', player, cells, lines };
  }
  if (board.every((c) => c !== null)) return { kind: 'draw' };
  return { kind: 'playing' };
}

export function drop(board: Board, col: number): { board: Cell[]; cell: number } | null {
  if (col < 0 || col >= COLS) return null;
  const row = landingRow(board, col);
  if (row < 0) return null;
  const next = board.slice();
  const cell = idx(row, col);
  next[cell] = currentPlayer(board);
  return { board: next, cell };
}

export const fourInARowRules: Rules = {
  empty: emptyBoard,
  turn: currentPlayer,
  outcome,
  apply(board, col) {
    if (outcome(board).kind !== 'playing') return null;
    return drop(board, col);
  },
};
