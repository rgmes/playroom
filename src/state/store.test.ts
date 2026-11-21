import { describe, expect, it } from 'vitest';
import type { Cell } from '../games/types';
import type { DotsBoard } from '../games/dots-and-boxes/logic';
import { AppState, initialState, reducer } from './store';
import { parse } from './storage';

const TTT = 'tic-tac-toe' as const;
const FIAR = 'four-in-a-row' as const;
const DOTS = 'dots-and-boxes' as const;

const run = (s: AppState, ...moves: number[]) =>
  moves.reduce((st, move) => reducer(st, { type: 'move', move, gameId: st.match!.gameId }), s);

describe('store', () => {
  it('ignores a stale computer move from a previous game', () => {
    let s = reducer(initialState(), { type: 'start', game: TTT });
    const oldId = s.match!.gameId;
    s = reducer(s, { type: 'newGame' });
    expect(reducer(s, { type: 'move', move: 4, gameId: oldId })).toBe(s);
  });

  it('ignores moves after leaving the game', () => {
    let s = reducer(initialState(), { type: 'start', game: TTT });
    const id = s.match!.gameId;
    s = reducer(s, { type: 'stop' });
    expect(reducer(s, { type: 'move', move: 4, gameId: id })).toBe(s);
  });

  it('scores pvp by slot, per game', () => {
    let s = reducer(initialState({ settings: { mode: 'pvp' } }), { type: 'start', game: TTT });
    s = run(s, 0, 3, 1, 4, 2); // slot 0 wins top row
    expect(s.scores[TTT].pvp).toEqual({ a: 1, b: 0, draws: 0 });
    expect(s.scores[FIAR].pvp).toEqual({ a: 0, b: 0, draws: 0 });
  });

  it('scores cpu mode from the human point of view when human plays second', () => {
    let s = reducer(initialState({ settings: { mode: 'cpu', humanSide: 1 } }), { type: 'start', game: TTT });
    s = run(s, 0, 3, 1, 4, 2); // slot 0 (computer) wins
    expect(s.scores[TTT].cpu).toEqual({ a: 0, b: 1, draws: 0 });
  });

  it('counts draws and blocks moves after game end', () => {
    let s = reducer(initialState({ settings: { mode: 'pvp' } }), { type: 'start', game: TTT });
    s = run(s, 0, 1, 2, 4, 3, 5, 7, 6, 8);
    expect(s.scores[TTT].pvp.draws).toBe(1);
    expect(run(s, 0)).toBe(s);
  });

  it('plays Four in a Row moves as columns with gravity', () => {
    let s = reducer(initialState({ settings: { mode: 'pvp' } }), { type: 'start', game: FIAR });
    s = run(s, 3, 3);
    const board = s.match!.board as Cell[];
    expect(board[5 * 7 + 3]).toBe(0); // bottom row
    expect(board[4 * 7 + 3]).toBe(1); // stacked on top
    expect(s.match!.lastCell).toBe(4 * 7 + 3);
    s = run(s, 0, 1, 0, 1, 0, 1, 0); // slot 0 stacks four in column 0
    expect(s.scores[FIAR].pvp).toEqual({ a: 1, b: 0, draws: 0 });
  });

  it('starts Dots & Boxes at the chosen size and gives an extra turn for a box', () => {
    let s = initialState({ settings: { mode: 'pvp', sizes: { [DOTS]: { cols: 2, rows: 3 } } } });
    s = reducer(s, { type: 'start', game: DOTS });
    let b = s.match!.board as DotsBoard;
    expect([b.cols, b.rows, b.boxes.length]).toEqual([2, 3, 6]);
    // 2x3: horizontals 0..7, verticals 8..16. Box 0 = H0, H2, V8, V9.
    s = run(s, 0, 2, 8); // players 0, 1, 0
    expect((s.match!.board as DotsBoard).turn).toBe(1);
    s = run(s, 9); // player 1 closes box 0
    b = s.match!.board as DotsBoard;
    expect(b.boxes[0]).toBe(1);
    expect(b.turn).toBe(1);
    expect(s.match!.lastCell).toBe(9);
  });

  it('records a Dots & Boxes result when the last line is drawn', () => {
    let s = initialState({ settings: { mode: 'cpu', humanSide: 0, sizes: { [DOTS]: { cols: 2, rows: 2 } } } });
    s = reducer(s, { type: 'start', game: DOTS });
    s = run(s, ...Array.from({ length: 12 }, (_, i) => i));
    const t = s.scores[DOTS].cpu;
    expect(t.a + t.b + t.draws).toBe(1);
  });

  it('reset clears only the current game and mode', () => {
    let s = initialState({
      scores: { [TTT]: { pvp: { a: 2, b: 1, draws: 0 }, cpu: { a: 5, b: 0, draws: 1 } }, [FIAR]: { pvp: { a: 3, b: 3, draws: 3 } } },
    });
    s = reducer(reducer(s, { type: 'settings', patch: { mode: 'pvp' } }), { type: 'resetScores', game: TTT });
    expect(s.scores[TTT].pvp).toEqual({ a: 0, b: 0, draws: 0 });
    expect(s.scores[TTT].cpu.a).toBe(5);
    expect(s.scores[FIAR].pvp.a).toBe(3);
  });
});

describe('storage', () => {
  const legacy = JSON.stringify({
    settings: { mode: 'pvp', difficulty: 'hard', humanSide: 1, markSetId: 'math' },
    scores: { pvp: { a: 4, b: 2, draws: 1 }, cpu: { a: 0, b: 3, draws: 2 } },
  });

  it('migrates old Tic Tac Toe saves when there is no Playroom save', () => {
    const saved = parse(null, legacy);
    expect(saved.settings).toEqual({ mode: 'pvp', difficulty: 'hard', humanSide: 1, markSetId: 'math' });
    expect(saved.scores?.[TTT]).toEqual({ pvp: { a: 4, b: 2, draws: 1 }, cpu: { a: 0, b: 3, draws: 2 } });
    const s = initialState(saved);
    expect(s.scores[TTT].pvp.a).toBe(4);
    expect(s.scores[FIAR].pvp).toEqual({ a: 0, b: 0, draws: 0 });
  });

  it('prefers the Playroom save over the old one', () => {
    const current = JSON.stringify({ settings: { mode: 'cpu' }, scores: { [TTT]: { pvp: { a: 9, b: 0, draws: 0 } } } });
    const saved = parse(current, legacy);
    expect(saved.settings?.mode).toBe('cpu');
    expect(saved.scores?.[TTT]?.pvp?.a).toBe(9);
  });

  it('keeps valid board sizes and drops bad ones', () => {
    const saved = parse(
      JSON.stringify({ settings: { sizes: { [DOTS]: { cols: 16, rows: 15 }, [TTT]: { cols: 99, rows: 2 } } } }),
      null,
    );
    expect(saved.settings?.sizes).toEqual({ [DOTS]: { cols: 16, rows: 15 } });
    expect(parse(JSON.stringify({ settings: { sizes: { [DOTS]: { cols: 1.5, rows: 4 } } } }), null).settings).toEqual({});
  });

  it('survives corrupt or odd data', () => {
    expect(parse('{not json', legacy)).toEqual({});
    const saved = parse(JSON.stringify({ settings: { mode: 'chess', markSetId: 'nope' }, scores: { [TTT]: { pvp: { a: 'x' } } } }), null);
    expect(saved.settings).toEqual({});
    expect(initialState(saved).scores[TTT].pvp).toEqual({ a: 0, b: 0, draws: 0 });
  });
});
