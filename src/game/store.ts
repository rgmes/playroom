import { Cell, Player, emptyBoard, outcome, play } from './logic';
import type { Difficulty } from './ai';
import { DEFAULT_SET_ID, MARK_SETS } from '../marks/library';

export type Mode = 'pvp' | 'cpu';

export interface Settings {
  mode: Mode;
  difficulty: Difficulty;
  /** Which slot the human plays against the computer. Slot 0 always moves first. */
  humanSide: Player;
  markSetId: string;
}

/**
 * Scores are tracked by player slot, not mark name, so switching mark sets keeps the tally.
 * pvp: a = player 1 (moves first), b = player 2.  cpu: a = you, b = computer.
 */
export interface Tally {
  a: number;
  b: number;
  draws: number;
}
export type Scores = Record<Mode, Tally>;

export interface AppState {
  screen: 'home' | 'game';
  settings: Settings;
  scores: Scores;
  board: Cell[];
  /** Bumped whenever the board is replaced, so stale computer moves are ignored. */
  gameId: number;
  lastMove: number | null;
}

export type Action =
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'start' }
  | { type: 'menu' }
  | { type: 'newGame' }
  | { type: 'move'; index: number; gameId: number }
  | { type: 'resetScores' };

const zero = (): Tally => ({ a: 0, b: 0, draws: 0 });

export const defaultSettings: Settings = {
  mode: 'cpu',
  difficulty: 'medium',
  humanSide: 0,
  markSetId: DEFAULT_SET_ID,
};

export interface Saved {
  settings?: Partial<Settings>;
  scores?: Partial<Scores>;
}

export function initialState(saved?: Saved): AppState {
  return {
    screen: 'home',
    settings: { ...defaultSettings, ...saved?.settings },
    scores: { pvp: zero(), cpu: zero(), ...saved?.scores },
    board: emptyBoard(),
    gameId: 0,
    lastMove: null,
  };
}

const fresh = (s: AppState): AppState => ({ ...s, board: emptyBoard(), gameId: s.gameId + 1, lastMove: null });

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'start':
      return { ...fresh(state), screen: 'game' };
    case 'menu':
      return { ...fresh(state), screen: 'home' };
    case 'newGame':
      return fresh(state);
    case 'resetScores':
      return { ...state, scores: { ...state.scores, [state.settings.mode]: zero() } };
    case 'move': {
      if (action.gameId !== state.gameId) return state;
      if (outcome(state.board).kind !== 'playing') return state;
      if (state.board[action.index] !== null) return state;
      const board = play(state.board, action.index);
      const result = outcome(board);
      let scores = state.scores;
      if (result.kind !== 'playing') {
        const { mode, humanSide } = state.settings;
        const t = { ...scores[mode] };
        if (result.kind === 'draw') t.draws++;
        else if (mode === 'pvp' ? result.player === 0 : result.player === humanSide) t.a++;
        else t.b++;
        scores = { ...scores, [mode]: t };
      }
      return { ...state, board, scores, lastMove: action.index };
    }
  }
}

// ---- Persistence ------------------------------------------------------------

const KEY = 'tictactoe:v1';

const isTally = (t: unknown): t is Tally =>
  !!t && typeof t === 'object' && ['a', 'b', 'draws'].every((k) => Number.isInteger((t as never)[k]));

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const s = data?.settings ?? {};
    const settings: Partial<Settings> = {};
    if (s.mode === 'pvp' || s.mode === 'cpu') settings.mode = s.mode;
    if (['easy', 'medium', 'hard'].includes(s.difficulty)) settings.difficulty = s.difficulty;
    if (s.humanSide === 0 || s.humanSide === 1) settings.humanSide = s.humanSide;
    if (MARK_SETS.some((m) => m.id === s.markSetId)) settings.markSetId = s.markSetId;
    const scores: Partial<Scores> = {};
    if (isTally(data?.scores?.pvp)) scores.pvp = data.scores.pvp;
    if (isTally(data?.scores?.cpu)) scores.cpu = data.scores.cpu;
    return { settings, scores };
  } catch {
    return {};
  }
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ settings: state.settings, scores: state.scores }));
  } catch {
    // Storage unavailable (private mode, blocked). The game still works.
  }
}
