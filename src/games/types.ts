// Types shared by every Playroom game.

/** 0 = first player (moves first), 1 = second player. */
export type Player = 0 | 1;
export type Cell = Player | null;
export type Board = readonly Cell[];

export type GameId = 'tic-tac-toe' | 'four-in-a-row' | 'dots-and-boxes';
export const GAME_IDS: GameId[] = ['tic-tac-toe', 'four-in-a-row', 'dots-and-boxes'];

/** Board size in boxes/cells, for games that let you choose one. */
export interface BoardSize {
  cols: number;
  rows: number;
}

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

/**
 * Pure rules. No React, no DOM — usable in tests and workers.
 * `B` is the game's state: a plain cell array for most games, an object when a game needs more.
 */
export interface Rules<B = Board> {
  /** A new game. Games with a size setting use `size`; others ignore it. */
  empty(size?: BoardSize): B;
  turn(board: B): Player;
  outcome(board: B): Outcome;
  /**
   * Apply a move (a cell for Tic Tac Toe, a column for Four in a Row, a line for Dots & Boxes).
   * Returns the new board and the cell/line that was filled, or null if illegal.
   */
  apply(board: B, move: number): { board: B; cell: number } | null;
}

export const other = (p: Player): Player => (p === 0 ? 1 : 0);
