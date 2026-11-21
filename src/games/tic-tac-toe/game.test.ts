import { describe, expect, it } from 'vitest';
import { Board, Cell, currentPlayer, emptyBoard, emptyCells, outcome, play, winner } from './logic';
import { bestMoves, chooseMove } from './ai';

const b = (s: string): Cell[] =>
  s.replace(/\s/g, '').split('').map((ch) => (ch === 'A' ? 0 : ch === 'B' ? 1 : null));

/** Deterministic RNG cycling through given values. */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('rules', () => {
  it('detects every winning line and returns its indices', () => {
    expect(winner(b('AAA ... ...'))).toEqual({ player: 0, line: [0, 1, 2] });
    expect(winner(b('B.. B.. B..'))).toEqual({ player: 1, line: [0, 3, 6] });
    expect(winner(b('..A .A. A..'))).toEqual({ player: 0, line: [2, 4, 6] });
    expect(winner(b('AB. ... ...'))).toBeNull();
  });

  it('detects a draw', () => {
    expect(outcome(b('ABA ABB BAA')).kind).toBe('draw');
  });

  it('alternates turns starting with player 0', () => {
    let board: Board = emptyBoard();
    expect(currentPlayer(board)).toBe(0);
    board = play(board, 4);
    expect(board[4]).toBe(0);
    expect(currentPlayer(board)).toBe(1);
  });

  it('rejects moves on filled cells or after the game ends', () => {
    expect(() => play(b('A.. ... ...'), 0)).toThrow();
    expect(() => play(b('AAA BB. ...'), 8)).toThrow();
  });
});

describe('computer opponent', () => {
  it('easy picks an empty cell', () => {
    const board = b('ABA B.. ...');
    for (const r of [0, 0.3, 0.99]) {
      expect(emptyCells(board)).toContain(chooseMove(board, 'easy', () => r));
    }
  });

  it('medium takes a win when available', () => {
    // B to move (4 filled); B can win at 5.
    expect(chooseMove(b('A.A BB. A..'), 'medium', seq(0))).toBe(5);
  });

  it('medium blocks the opponent', () => {
    // B to move; A threatens 2.
    expect(chooseMove(b('AA. .B. ...'), 'medium', seq(0))).toBe(2);
  });

  // Exhaustively play every possible opponent line against the hard AI.
  function neverLoses(aiPlayer: 0 | 1): { games: number } {
    let games = 0;
    const walk = (board: Board) => {
      const o = outcome(board);
      if (o.kind !== 'playing') {
        games++;
        if (o.kind === 'win') expect(o.player).toBe(aiPlayer);
        return;
      }
      if (currentPlayer(board) === aiPlayer) {
        // Hard picks randomly among bestMoves, so walk every one of them.
        const best = bestMoves(board);
        expect(best).toContain(chooseMove(board, 'hard', () => 0.5));
        best.forEach((m) => walk(play(board, m)));
      } else {
        emptyCells(board).forEach((m) => walk(play(board, m)));
      }
    };
    walk(emptyBoard());
    return { games };
  }

  it('hard never loses when moving first', () => {
    expect(neverLoses(0).games).toBeGreaterThan(0);
  });

  it('hard never loses when moving second', () => {
    expect(neverLoses(1).games).toBeGreaterThan(0);
  });
});
