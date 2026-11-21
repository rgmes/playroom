import type { Board, Difficulty } from '../types';
import type { AiRequest, AiResponse } from './ai.worker';

let worker: Worker | null = null;
let failed = false;
let nextId = 1;
const pending = new Map<number, (move: number) => void>();

function getWorker(): Worker | null {
  if (failed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<AiResponse>) => {
        pending.get(e.data.id)?.(e.data.move);
        pending.delete(e.data.id);
      };
      worker.onerror = () => {
        // Fall back to the main thread for this and every later request.
        failed = true;
        worker = null;
        const waiting = [...pending.entries()];
        pending.clear();
        waiting.forEach(([, resolve]) => resolve(-1));
      };
    } catch {
      failed = true;
      return null;
    }
  }
  return worker;
}

async function onMainThread(board: Board, difficulty: Difficulty): Promise<number> {
  const { chooseMove } = await import('./ai');
  return chooseMove(board, difficulty);
}

/** Ask the computer for a move. Uses a worker when available. */
export async function pickFourInARowMove(board: Board, difficulty: Difficulty): Promise<number> {
  const w = getWorker();
  if (!w) return onMainThread(board, difficulty);
  const id = nextId++;
  const move = await new Promise<number>((resolve) => {
    pending.set(id, resolve);
    const req: AiRequest = { id, board: [...board], difficulty };
    w.postMessage(req);
  });
  return move >= 0 ? move : onMainThread(board, difficulty);
}
