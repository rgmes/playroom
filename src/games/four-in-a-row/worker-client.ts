import type { Board } from '../types';
import { workerMover } from '../worker-client';

/** Ask the computer for a Four in a Row move. Uses a worker when available. */
export const pickFourInARowMove = workerMover<Board>(
  () => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
  async (board, difficulty) => (await import('./ai')).chooseMove(board, difficulty),
);
