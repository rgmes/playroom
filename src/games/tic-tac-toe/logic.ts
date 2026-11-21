// Tic Tac Toe rules. Pure: no React, no DOM.
import { Board, Cell, Outcome, Player, Rules } from '../types';

export type { Board, Cell, Player } from '../types';
export { other } from '../types';

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const emptyBoard = (): Cell[] => Array<Cell>(9).fill(null);

export interface WinResult {
  player: Player;
  line: readonly [number, number, number];
}

export function winner(board: Board): WinResult | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) {
      return { player: v, line };
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return board.every((c) => c !== null);
}

export function outcome(board: Board): Outcome {
  const w = winner(board);
  if (w) return { kind: 'win', player: w.player, cells: [...w.line], lines: [[w.line[0], w.line[2]]] };
  if (isFull(board)) return { kind: 'draw' };
  return { kind: 'playing' };
}

export function emptyCells(board: Board): number[] {
  const out: number[] = [];
  board.forEach((c, i) => {
    if (c === null) out.push(i);
  });
  return out;
}

/** Whose turn it is, derived from the board. Player 0 always moves first. */
export function currentPlayer(board: Board): Player {
  const filled = board.filter((c) => c !== null).length;
  return (filled % 2) as Player;
}

export function play(board: Board, index: number): Cell[] {
  if (index < 0 || index > 8 || board[index] !== null) {
    throw new Error(`Illegal move at ${index}`);
  }
  if (outcome(board).kind !== 'playing') {
    throw new Error('Game is already over');
  }
  const next = board.slice();
  next[index] = currentPlayer(board);
  return next;
}

export const ticTacToeRules: Rules = {
  empty: emptyBoard,
  turn: currentPlayer,
  outcome,
  apply(board, move) {
    if (move < 0 || move > 8 || board[move] !== null || outcome(board).kind !== 'playing') return null;
    return { board: play(board, move), cell: move };
  },
};
