// UI-side description of every game. The hub, setup and match screens are built from this.
import type { ComponentType } from 'react';
import type { MarkDef, MarkSet } from '../marks/library';
import type { Settings } from '../state/store';
import type { Board, Difficulty, GameId, Outcome, Player, Rules } from './types';
import { chooseMove as tttChooseMove } from './tic-tac-toe/ai';
import { TicTacToeBoard } from './tic-tac-toe/Board';
import { TicTacToePreview } from './tic-tac-toe/Preview';
import { ticTacToeRules } from './tic-tac-toe/logic';
import { pickFourInARowMove } from './four-in-a-row/worker-client';
import { FourInARowBoard } from './four-in-a-row/Board';
import { FourInARowPreview } from './four-in-a-row/Preview';
import { colOf, fourInARowRules, rowFromBottom } from './four-in-a-row/logic';
import { pickDotsMove } from './dots-and-boxes/worker-client';
import { DotsBoardView } from './dots-and-boxes/Board';
import { DotsPreview } from './dots-and-boxes/Preview';
import { DotsOptions } from './dots-and-boxes/Options';
import { boxCounts, dotsRules, geometry, lineDots, type DotsBoard } from './dots-and-boxes/logic';

export interface BoardProps<B = Board> {
  board: B;
  marks: [MarkDef, MarkDef];
  /** Mark for the hover preview (current human player), or null when humans can't move. */
  preview: MarkDef | null;
  result: Outcome;
  gameId: number;
  lastCell: number | null;
  onPlay: (move: number) => void;
}

export interface GameDef<B = Board> {
  id: GameId;
  name: string;
  tagline: string;
  rules: Rules<B>;
  Board: ComponentType<BoardProps<B>>;
  Preview: ComponentType<{ set: MarkSet }>;
  pickMove: (board: B, difficulty: Difficulty) => Promise<number>;
  /**
   * What the last move was, for screen readers: who made it and a phrase such as
   * "played X at row 1, column 2". `withMark` adds the mark name ("played X" vs "played").
   */
  describeMove: (
    board: B,
    move: number,
    marks: [MarkDef, MarkDef],
    withMark: boolean,
  ) => { player: Player; text: string } | null;
  /** A note on how hard the computer is, shown on the setup screen. */
  hardNote: string;
  /** Use the wider play screen (bigger boards). */
  wide?: boolean;
  /** Points scored inside one game (boxes), shown live during play. */
  points?: (board: B) => [number, number];
  /** Cheer when a move earns another turn, e.g. "Box!" */
  againNote?: string;
  /** Extra settings on the setup screen, such as the board size. */
  Options?: ComponentType<{ settings: Settings; update: (patch: Partial<Settings>) => void }>;
}

const ttt: GameDef<Board> = {
  id: 'tic-tac-toe',
  name: 'Tic Tac Toe',
  tagline: 'Three in a row on a 3×3 grid',
  rules: ticTacToeRules,
  Board: TicTacToeBoard,
  Preview: TicTacToePreview,
  pickMove: async (board, difficulty) => tttChooseMove(board, difficulty),
  describeMove: (board, cell, marks, withMark) => {
    const p = board[cell];
    if (p === null || p === undefined) return null;
    const where = `row ${Math.floor(cell / 3) + 1}, column ${(cell % 3) + 1}`;
    return { player: p, text: `played ${withMark ? `${marks[p].name} ` : ''}at ${where}` };
  },
  hardNote: 'Hard never loses. The best you can do is a draw!',
};

const fiar: GameDef<Board> = {
  id: 'four-in-a-row',
  name: 'Four in a Row',
  tagline: 'Drop pieces, line up four',
  rules: fourInARowRules,
  Board: FourInARowBoard,
  Preview: FourInARowPreview,
  pickMove: pickFourInARowMove,
  describeMove: (board, cell, marks, withMark) => {
    const p = board[cell];
    if (p === null || p === undefined) return null;
    const where = `column ${colOf(cell) + 1}, row ${rowFromBottom(cell)}`;
    return { player: p, text: `dropped ${withMark ? `${marks[p].name} ` : ''}in ${where}` };
  },
  hardNote: 'Hard is tough, but it can be beaten.',
  wide: true,
};

const dots: GameDef<DotsBoard> = {
  id: 'dots-and-boxes',
  name: 'Dots & Boxes',
  tagline: 'Join the dots, claim the boxes',
  rules: dotsRules,
  Board: DotsBoardView,
  Preview: DotsPreview,
  pickMove: pickDotsMove,
  describeMove: (board, line) => {
    const p = board.lines[line];
    if (p === null || p === undefined) return null;
    const g = geometry(board.cols, board.rows);
    const [[r1, c1], [r2, c2]] = lineDots(g, line);
    // Any box next to the newest line that is now owned was closed by it.
    let closed = 0;
    for (let s = 0; s < 2; s++) {
      const b = g.lineBoxes[line * 2 + s];
      if (b >= 0 && board.boxes[b] !== null) closed++;
    }
    const boxes = closed ? `, closing ${closed} ${closed === 1 ? 'box' : 'boxes'}` : '';
    return {
      player: p,
      text: `drew a line from row ${r1 + 1}, dot ${c1 + 1} to row ${r2 + 1}, dot ${c2 + 1}${boxes}`,
    };
  },
  hardNote: 'Hard knows the chain tricks, but it can be beaten.',
  wide: true,
  points: boxCounts,
  againNote: 'Box!',
  Options: DotsOptions,
};

// Each game has its own board type; shared screens treat boards as opaque.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameDef = GameDef<any>;

export const GAMES: Record<GameId, AnyGameDef> = {
  'tic-tac-toe': ttt,
  'four-in-a-row': fiar,
  'dots-and-boxes': dots,
};

export const GAME_LIST = Object.values(GAMES);
