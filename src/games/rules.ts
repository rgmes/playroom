// Pure rules for every game, keyed by id. Safe to import from tests (no React, no workers).
import type { GameId, Rules } from './types';
import { ticTacToeRules } from './tic-tac-toe/logic';
import { fourInARowRules } from './four-in-a-row/logic';
import { dotsRules } from './dots-and-boxes/logic';

// Each game has its own board type; shared code treats boards as opaque.
export const RULES: Record<GameId, Rules<unknown>> = {
  'tic-tac-toe': ticTacToeRules as Rules<unknown>,
  'four-in-a-row': fourInARowRules as Rules<unknown>,
  'dots-and-boxes': dotsRules as Rules<unknown>,
};
