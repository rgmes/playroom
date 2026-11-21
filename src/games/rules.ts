// Pure rules for every game, keyed by id. Safe to import from tests (no React, no workers).
import type { GameId, Rules } from './types';
import { ticTacToeRules } from './tic-tac-toe/logic';
import { fourInARowRules } from './four-in-a-row/logic';

export const RULES: Record<GameId, Rules> = {
  'tic-tac-toe': ticTacToeRules,
  'four-in-a-row': fourInARowRules,
};
