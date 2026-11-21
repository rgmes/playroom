import type { Cell, Difficulty, GameId, Mode, Player, Rules } from '../games/types';
import { GAME_IDS } from '../games/types';
import { RULES } from '../games/rules';
import { DEFAULT_SET_ID } from '../marks/library';

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
export type AllScores = Record<GameId, Scores>;

export interface Match {
  game: GameId;
  board: Cell[];
  /** Unique per board. Computer moves carry it, so a move for an old board is ignored. */
  gameId: number;
  /** The cell filled by the last move (for animation and announcements). */
  lastCell: number | null;
}

export interface AppState {
  settings: Settings;
  scores: AllScores;
  match: Match | null;
  serial: number;
}

export type Action =
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'start'; game: GameId }
  | { type: 'stop' }
  | { type: 'newGame' }
  | { type: 'move'; move: number; gameId: number }
  | { type: 'resetScores'; game: GameId };

export const zeroTally = (): Tally => ({ a: 0, b: 0, draws: 0 });
export const zeroScores = (): Scores => ({ pvp: zeroTally(), cpu: zeroTally() });

export const defaultSettings: Settings = {
  mode: 'cpu',
  difficulty: 'medium',
  humanSide: 0,
  markSetId: DEFAULT_SET_ID,
};

export interface Saved {
  settings?: Partial<Settings>;
  scores?: Partial<Record<GameId, Partial<Scores>>>;
}

export function initialState(saved?: Saved): AppState {
  const scores = {} as AllScores;
  for (const id of GAME_IDS) scores[id] = { ...zeroScores(), ...saved?.scores?.[id] };
  return {
    settings: { ...defaultSettings, ...saved?.settings },
    scores,
    match: null,
    serial: 0,
  };
}

function freshMatch(state: AppState, game: GameId): AppState {
  const serial = state.serial + 1;
  return { ...state, serial, match: { game, board: RULES[game].empty(), gameId: serial, lastCell: null } };
}

function record(state: AppState, rules: Rules, board: Cell[], game: GameId): AllScores {
  const result = rules.outcome(board);
  if (result.kind === 'playing') return state.scores;
  const { mode, humanSide } = state.settings;
  const t = { ...state.scores[game][mode] };
  if (result.kind === 'draw') t.draws++;
  else if (mode === 'pvp' ? result.player === 0 : result.player === humanSide) t.a++;
  else t.b++;
  return { ...state.scores, [game]: { ...state.scores[game], [mode]: t } };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'start':
      return freshMatch(state, action.game);
    case 'stop':
      return { ...state, match: null, serial: state.serial + 1 };
    case 'newGame':
      return state.match ? freshMatch(state, state.match.game) : state;
    case 'resetScores':
      return {
        ...state,
        scores: {
          ...state.scores,
          [action.game]: { ...state.scores[action.game], [state.settings.mode]: zeroTally() },
        },
      };
    case 'move': {
      const m = state.match;
      if (!m || action.gameId !== m.gameId) return state;
      const rules = RULES[m.game];
      const next = rules.apply(m.board, action.move);
      if (!next) return state;
      return {
        ...state,
        match: { ...m, board: next.board, lastCell: next.cell },
        scores: record(state, rules, next.board, m.game),
      };
    }
  }
}
