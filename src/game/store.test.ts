import { describe, expect, it } from 'vitest';
import { AppState, initialState, reducer } from './store';

const run = (s: AppState, ...moves: number[]) =>
  moves.reduce((st, index) => reducer(st, { type: 'move', index, gameId: st.gameId }), s);

describe('store', () => {
  it('ignores a stale computer move from a previous game', () => {
    let s = reducer(initialState(), { type: 'start' });
    const oldId = s.gameId;
    s = reducer(s, { type: 'newGame' });
    const after = reducer(s, { type: 'move', index: 4, gameId: oldId });
    expect(after.board[4]).toBeNull();
  });

  it('scores pvp by slot', () => {
    let s = reducer(initialState({ settings: { mode: 'pvp' } }), { type: 'start' });
    s = run(s, 0, 3, 1, 4, 2); // slot 0 wins top row
    expect(s.scores.pvp).toEqual({ a: 1, b: 0, draws: 0 });
  });

  it('scores cpu mode from the human point of view when human plays second', () => {
    let s = reducer(initialState({ settings: { mode: 'cpu', humanSide: 1 } }), { type: 'start' });
    s = run(s, 0, 3, 1, 4, 2); // slot 0 (computer) wins
    expect(s.scores.cpu).toEqual({ a: 0, b: 1, draws: 0 });
  });

  it('counts draws and blocks moves after game end', () => {
    let s = reducer(initialState({ settings: { mode: 'pvp' } }), { type: 'start' });
    s = run(s, 0, 1, 2, 4, 3, 5, 7, 6, 8);
    expect(s.scores.pvp.draws).toBe(1);
    expect(run(s, 0)).toBe(s);
  });

  it('reset clears only the current mode', () => {
    let s = initialState({ scores: { pvp: { a: 2, b: 1, draws: 0 }, cpu: { a: 5, b: 0, draws: 1 } } });
    s = reducer(reducer(s, { type: 'settings', patch: { mode: 'pvp' } }), { type: 'resetScores' });
    expect(s.scores.pvp).toEqual({ a: 0, b: 0, draws: 0 });
    expect(s.scores.cpu.a).toBe(5);
  });
});
