import { describe, expect, it } from 'vitest';
import { AppState, initialState, reducer } from './store';
import { parse } from './storage';

const TTT = 'tic-tac-toe' as const;
const FIAR = 'four-in-a-row' as const;

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
    expect(s.match!.board[5 * 7 + 3]).toBe(0); // bottom row
    expect(s.match!.board[4 * 7 + 3]).toBe(1); // stacked on top
    expect(s.match!.lastCell).toBe(4 * 7 + 3);
    s = run(s, 0, 1, 0, 1, 0, 1, 0); // slot 0 stacks four in column 0
    expect(s.scores[FIAR].pvp).toEqual({ a: 1, b: 0, draws: 0 });
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

  it('survives corrupt or odd data', () => {
    expect(parse('{not json', legacy)).toEqual({});
    const saved = parse(JSON.stringify({ settings: { mode: 'chess', markSetId: 'nope' }, scores: { [TTT]: { pvp: { a: 'x' } } } }), null);
    expect(saved.settings).toEqual({});
    expect(initialState(saved).scores[TTT].pvp).toEqual({ a: 0, b: 0, draws: 0 });
  });
});
