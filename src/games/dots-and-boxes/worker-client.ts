import { workerMover } from '../worker-client';
import type { DotsBoard } from './logic';

/** Ask the computer for a Dots & Boxes line. Uses a worker when available. */
export const pickDotsMove = workerMover<DotsBoard>(
  () => new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' }),
  async (board, difficulty) => (await import('./ai')).chooseMove(board, difficulty),
);
