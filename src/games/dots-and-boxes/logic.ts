// Dots & Boxes rules. Pure: no React, no DOM, safe in tests and workers.
//
// A board of `cols` x `rows` boxes has (cols + 1) x (rows + 1) dots.
// Lines are numbered horizontals first, then verticals:
//   H(r, c)  r in 0..rows, c in 0..cols-1   index r * cols + c
//   V(r, c)  r in 0..rows-1, c in 0..cols   index H_COUNT + r * (cols + 1) + c
// Box (r, c) is index r * cols + c; its sides are H(r,c), H(r+1,c), V(r,c), V(r,c+1).
import type { BoardSize, Cell, Outcome, Player, Rules } from '../types';
import { other } from '../types';

export type Size = BoardSize;

export const MIN_SIZE = 2;
export const MAX_SIZE = 16;
export const DEFAULT_SIZE: Size = { cols: 4, rows: 4 };

export interface DotsBoard {
  cols: number;
  rows: number;
  /** Whose move it is. Stored because closing a box gives an extra turn. */
  turn: Player;
  /** Who drew each line, or null if it is still open. */
  lines: Cell[];
  /** Who owns each box, or null. */
  boxes: Cell[];
}

export interface Geometry {
  cols: number;
  rows: number;
  hCount: number;
  lineCount: number;
  boxCount: number;
  /** The (up to) two boxes on either side of each line; -1 = outside the board. */
  lineBoxes: Int16Array; // [a0, b0, a1, b1, ...]
  /** The four sides of each box: top, bottom, left, right. */
  boxLines: Int16Array; // [t0, b0, l0, r0, ...]
}

const geometryCache = new Map<string, Geometry>();

export function geometry(cols: number, rows: number): Geometry {
  const key = `${cols}x${rows}`;
  const hit = geometryCache.get(key);
  if (hit) return hit;

  const hCount = (rows + 1) * cols;
  const lineCount = hCount + rows * (cols + 1);
  const boxCount = cols * rows;
  const lineBoxes = new Int16Array(lineCount * 2).fill(-1);
  const boxLines = new Int16Array(boxCount * 4);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = r * cols + c;
      const sides = [r * cols + c, (r + 1) * cols + c, hCount + r * (cols + 1) + c, hCount + r * (cols + 1) + c + 1];
      sides.forEach((l, i) => {
        boxLines[b * 4 + i] = l;
        // Each line gets the box above/left in slot 0, below/right in slot 1.
        const slot = i === 0 || i === 2 ? 1 : 0;
        lineBoxes[l * 2 + slot] = b;
      });
    }
  }
  const g = { cols, rows, hCount, lineCount, boxCount, lineBoxes, boxLines };
  geometryCache.set(key, g);
  return g;
}

export const isHorizontal = (g: Geometry, line: number) => line < g.hCount;

/** The two dots a line joins, as [row, col] pairs. */
export function lineDots(g: Geometry, line: number): [[number, number], [number, number]] {
  if (line < g.hCount) {
    const r = Math.floor(line / g.cols);
    const c = line % g.cols;
    return [
      [r, c],
      [r, c + 1],
    ];
  }
  const v = line - g.hCount;
  const r = Math.floor(v / (g.cols + 1));
  const c = v % (g.cols + 1);
  return [
    [r, c],
    [r + 1, c],
  ];
}

/** Keep a size within limits. Rounds fractions; falls back to the default for junk. */
export function clampSize(size: Partial<Size> | undefined, min = MIN_SIZE): Size {
  const fix = (n: unknown, d: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(MAX_SIZE, Math.max(min, Math.round(n))) : d;
  return { cols: fix(size?.cols, DEFAULT_SIZE.cols), rows: fix(size?.rows, DEFAULT_SIZE.rows) };
}

export function emptyBoard(size: Size = DEFAULT_SIZE): DotsBoard {
  // The rules allow 1-row boards (handy for tests); the size picker keeps players at 2+.
  const { cols, rows } = clampSize(size, 1);
  const g = geometry(cols, rows);
  return {
    cols,
    rows,
    turn: 0,
    lines: Array<Cell>(g.lineCount).fill(null),
    boxes: Array<Cell>(g.boxCount).fill(null),
  };
}

/** Number of drawn sides of a box. */
export function sidesDrawn(board: DotsBoard, g: Geometry, box: number): number {
  let n = 0;
  for (let i = 0; i < 4; i++) if (board.lines[g.boxLines[box * 4 + i]] !== null) n++;
  return n;
}

export function boxCounts(board: DotsBoard): [number, number] {
  const n: [number, number] = [0, 0];
  for (const b of board.boxes) if (b !== null) n[b]++;
  return n;
}

/** Boxes that the given line would complete (0, 1 or 2 of them). */
export function boxesClosedBy(board: DotsBoard, line: number): number[] {
  const g = geometry(board.cols, board.rows);
  const out: number[] = [];
  for (let s = 0; s < 2; s++) {
    const b = g.lineBoxes[line * 2 + s];
    if (b >= 0 && sidesDrawn(board, g, b) === 3) out.push(b);
  }
  return out;
}

export function outcome(board: DotsBoard): Outcome {
  if (board.lines.some((l) => l === null)) return { kind: 'playing' };
  const [a, b] = boxCounts(board);
  if (a === b) return { kind: 'draw' };
  const player: Player = a > b ? 0 : 1;
  const cells = board.boxes.flatMap((o, i) => (o === player ? [i] : []));
  return { kind: 'win', player, cells, lines: [] };
}

export function drawLine(board: DotsBoard, line: number): { board: DotsBoard; cell: number } | null {
  if (!Number.isInteger(line) || line < 0 || line >= board.lines.length) return null;
  if (board.lines[line] !== null) return null;
  const closed = boxesClosedBy(board, line);
  const lines = board.lines.slice();
  lines[line] = board.turn;
  const boxes = board.boxes.slice();
  for (const b of closed) boxes[b] = board.turn;
  // Closing a box earns another turn.
  const turn = closed.length > 0 ? board.turn : other(board.turn);
  return { board: { ...board, turn, lines, boxes }, cell: line };
}

export const dotsRules: Rules<DotsBoard> = {
  empty: (size) => emptyBoard(size),
  turn: (b) => b.turn,
  outcome,
  apply: drawLine,
};
