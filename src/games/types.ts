// Types shared by every Playroom game.

/** 0 = first player (moves first), 1 = second player. */
export type Player = 0 | 1;
export type Cell = Player | null;
export type Board = readonly Cell[];

export type GameId = 'tic-tac-toe' | 'four-in-a-row';
export const GAME_IDS: GameId[] = ['tic-tac-toe', 'four-in-a-row'];

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'pvp' | 'cpu';

export type Outcome =
  | { kind: 'playing' }
  | {
      kind: 'win';
      player: Player;
      /** Every cell that is part of a winning run (may be more than one run). */
      cells: number[];
      /** Each winning run as [first cell, last cell], for drawing strike lines. */
      lines: [number, number][];
    }
  | { kind: 'draw' };

/** Pure rules. No React, no DOM — usable in tests and workers. */
export interface Rules {
  empty(): Cell[];
  turn(board: Board): Player;
  outcome(board: Board): Outcome;
  /**
   * Apply a move (a cell for Tic Tac Toe, a column for Four in a Row).
   * Returns the new board and the cell that was filled, or null if illegal.
   */
  apply(board: Board, move: number): { board: Cell[]; cell: number } | null;
}

export const other = (p: Player): Player => (p === 0 ? 1 : 0);
