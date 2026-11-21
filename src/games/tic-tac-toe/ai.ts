import { Board, LINES, Player, currentPlayer, emptyCells, other, play, winner } from './logic';

import type { Difficulty } from '../types';
export type { Difficulty } from '../types';
export type Rng = () => number;

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** Index that completes a line for `p`, or null. */
function completingMove(board: Board, p: Player): number | null {
  for (const [a, b, c] of LINES) {
    const cells = [board[a], board[b], board[c]];
    const mine = cells.filter((v) => v === p).length;
    const empty = cells.filter((v) => v === null).length;
    if (mine === 2 && empty === 1) {
      return [a, b, c][cells.indexOf(null)];
    }
  }
  return null;
}

/** Minimax score from the point of view of `me`. Faster wins / slower losses score higher. */
function minimax(board: Board, me: Player, depth: number): number {
  const w = winner(board);
  if (w) return w.player === me ? 10 - depth : depth - 10;
  const moves = emptyCells(board);
  if (moves.length === 0) return 0;
  const turn = currentPlayer(board);
  const scores = moves.map((m) => minimax(play(board, m), me, depth + 1));
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** All moves tied for the best minimax score. */
export function bestMoves(board: Board): number[] {
  const me = currentPlayer(board);
  let best = -Infinity;
  let moves: number[] = [];
  for (const m of emptyCells(board)) {
    const s = minimax(play(board, m), me, 1);
    if (s > best) {
      best = s;
      moves = [m];
    } else if (s === best) {
      moves.push(m);
    }
  }
  return moves;
}

export function chooseMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  const moves = emptyCells(board);
  if (moves.length === 0) throw new Error('No moves left');
  const me = currentPlayer(board);

  if (difficulty === 'easy') return pick(moves, rng);

  if (difficulty === 'medium') {
    const win = completingMove(board, me);
    if (win !== null) return win;
    const block = completingMove(board, other(me));
    if (block !== null) return block;
    return pick(moves, rng);
  }

  // Hard: perfect play, random among equally good moves for variety.
  return pick(bestMoves(board), rng);
}
