// UI-side description of every game. The hub, setup and match screens are built from this.
import type { ComponentType } from 'react';
import type { MarkDef, MarkSet } from '../marks/library';
import type { Board, Difficulty, GameId, Outcome, Rules } from './types';
import { RULES } from './rules';
import { chooseMove as tttChooseMove } from './tic-tac-toe/ai';
import { TicTacToeBoard } from './tic-tac-toe/Board';
import { TicTacToePreview } from './tic-tac-toe/Preview';
import { pickFourInARowMove } from './four-in-a-row/worker-client';
import { FourInARowBoard } from './four-in-a-row/Board';
import { FourInARowPreview } from './four-in-a-row/Preview';
import { colOf, rowFromBottom } from './four-in-a-row/logic';

export interface BoardProps {
  board: Board;
  marks: [MarkDef, MarkDef];
  /** Mark for the hover preview (current human player), or null when humans can't move. */
  preview: MarkDef | null;
  result: Outcome;
  gameId: number;
  lastCell: number | null;
  onPlay: (move: number) => void;
}

export interface GameDef {
  id: GameId;
  name: string;
  tagline: string;
  rules: Rules;
  Board: ComponentType<BoardProps>;
  Preview: ComponentType<{ set: MarkSet }>;
  pickMove: (board: Board, difficulty: Difficulty) => Promise<number>;
  /** Where a move landed, for screen readers: "row 1, column 2". */
  describeCell: (cell: number) => string;
  /** "played" / "dropped" */
  verb: string;
  /** A note on how hard the computer is, shown on the setup screen. */
  hardNote: string;
}

export const GAMES: Record<GameId, GameDef> = {
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    tagline: 'Three in a row on a 3×3 grid',
    rules: RULES['tic-tac-toe'],
    Board: TicTacToeBoard,
    Preview: TicTacToePreview,
    pickMove: async (board, difficulty) => tttChooseMove(board, difficulty),
    describeCell: (i) => `row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`,
    verb: 'played',
    hardNote: 'Hard never loses. The best you can do is a draw!',
  },
  'four-in-a-row': {
    id: 'four-in-a-row',
    name: 'Four in a Row',
    tagline: 'Drop pieces, line up four',
    rules: RULES['four-in-a-row'],
    Board: FourInARowBoard,
    Preview: FourInARowPreview,
    pickMove: pickFourInARowMove,
    describeCell: (i) => `column ${colOf(i) + 1}, row ${rowFromBottom(i)}`,
    verb: 'dropped',
    hardNote: 'Hard is tough, but it can be beaten.',
  },
};

export const GAME_LIST = Object.values(GAMES);
