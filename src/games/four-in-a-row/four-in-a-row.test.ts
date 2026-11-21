import { describe, expect, it } from 'vitest';
import type { Board, Cell } from '../types';
import { COLS, currentPlayer, drop, emptyBoard, fourInARowRules, idx, landingRow, outcome } from './logic';
import { DEPTH, chooseMove } from './ai';

/** Build a board from rows written top to bottom: '.' empty, 'A' player 0, 'B' player 1. */
const B = (...rows: string[]): Cell[] =>
  rows
    .join('')
    .split('')
    .map((ch) => (ch === 'A' ? 0 : ch === 'B' ? 1 : null));

const EMPTY_ROW = '.......';
const pad = (...bottom: string[]) => B(...Array(6 - bottom.length).fill(EMPTY_ROW), ...bottom);

/** Small seeded RNG (mulberry32) so random play is repeatable. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('rules', () => {
  it('drops pieces to the lowest empty row', () => {
    let b: Board = emptyBoard();
    expect(landingRow(b, 2)).toBe(5);
    b = drop(b, 2)!.board;
    expect(b[idx(5, 2)]).toBe(0);
    const second = drop(b, 2)!;
    expect(second.cell).toBe(idx(4, 2));
    expect(second.board[idx(4, 2)]).toBe(1);
  });

  it('rejects a full column', () => {
    let b: Board = emptyBoard();
    for (let k = 0; k < 6; k++) b = drop(b, 0)!.board;
    expect(drop(b, 0)).toBeNull();
    expect(fourInARowRules.apply(b, 0)).toBeNull();
  });

  it('detects wins in all four directions', () => {
    const across = outcome(pad('.AAAA..'));
    expect(across).toMatchObject({ kind: 'win', player: 0, lines: [[idx(5, 1), idx(5, 4)]] });

    const down = outcome(pad('..B....', '..B....', '..B....', '..B....'));
    expect(down).toMatchObject({ kind: 'win', player: 1 });

    const diagUp = outcome(pad('...A...', '..AB...', '.ABB...', 'ABBB...'));
    expect(diagUp).toMatchObject({ kind: 'win', player: 0 });
    expect(diagUp.kind === 'win' && diagUp.cells.sort()).toEqual([idx(2, 3), idx(3, 2), idx(4, 1), idx(5, 0)].sort());

    const diagDown = outcome(pad('B......', 'AB.....', 'AAB....', 'AAAB...'));
    expect(diagDown).toMatchObject({ kind: 'win', player: 1 });
  });

  it('reports every cell of a five-long run, and two runs at once', () => {
    const five = outcome(pad('AAAAA..'));
    expect(five.kind === 'win' && five.cells.length).toBe(5);

    // Last piece at bottom-left completes a row and a column.
    const double = outcome(pad('A......', 'A......', 'A......', 'AAAA...'));
    expect(double.kind === 'win' && double.lines.length).toBe(2);
    expect(double.kind === 'win' && double.cells.length).toBe(7);
  });

  it('detects a draw on a full board with no four', () => {
    const full: Cell[] = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < COLS; c++) full.push(((Math.floor(r / 2) + c) % 2) as 0 | 1);
    expect(outcome(full).kind).toBe('draw');
  });

  it('refuses moves after the game is over', () => {
    expect(fourInARowRules.apply(pad('AAAA...'), 5)).toBeNull();
  });
});

describe('computer opponent', () => {
  const levels = ['easy', 'medium', 'hard'] as const;

  it('every level takes a win it can see', () => {
    // A to move (A=3, B=3); A wins at column 3.
    const board = pad('AAA.BBB');
    for (const d of levels) expect(chooseMove(board, d, seeded(1))).toBe(3);
  });

  const threats: [string, Cell[], number][] = [
    ['across', pad('....A..', 'BBB.AA.'), 3],
    ['down', pad('B......', 'B......', 'B.AA..A'), 0],
    ['diagonal', B(EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, '..AB...', '.ABA...', 'ABAB...'), 3],
  ];

  for (const [name, board, block] of threats) {
    it(`medium and hard block a threat ${name}`, () => {
      for (const d of ['medium', 'hard'] as const) {
        for (const seed of [1, 2, 3]) expect(chooseMove(board, d, seeded(seed))).toBe(block);
      }
    });
  }

  it('medium and hard never play right under the opponent\'s winning square', () => {
    // A threatens row 2 from the bottom at column 3; B playing column 3 would set it up.
    const board = pad('AAA....', 'BBA...B');
    expect(currentPlayer(board)).toBe(1);
    for (const d of ['medium', 'hard'] as const) {
      for (const seed of [1, 2, 3, 4, 5]) expect(chooseMove(board, d, seeded(seed))).not.toBe(3);
    }
  });

  it('hard thinks fast enough on an empty board', () => {
    const t = performance.now();
    chooseMove(emptyBoard(), 'hard', seeded(7));
    const ms = performance.now() - t;
    expect(ms).toBeLessThan(1500);
  });

  it(
    'hard beats easy nearly every time',
    () => {
      let hardWins = 0;
      const games = 10;
      for (let g = 0; g < games; g++) {
        const rng = seeded(100 + g);
        const hardSide = g % 2;
        let board: Board = emptyBoard();
        while (outcome(board).kind === 'playing') {
          const level = currentPlayer(board) === hardSide ? 'hard' : 'easy';
          board = drop(board, chooseMove(board, level, rng))!.board;
        }
        const o = outcome(board);
        if (o.kind === 'win' && o.player === hardSide) hardWins++;
      }
      expect(hardWins).toBeGreaterThanOrEqual(9);
    },
    60_000,
  );

  it('uses deeper search for hard than medium', () => {
    expect(DEPTH.hard).toBeGreaterThan(DEPTH.medium);
  });
});
