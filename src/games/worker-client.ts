// Runs a game's computer player in a Web Worker so the page never freezes while it thinks.
import type { Difficulty } from './types';

export interface AiRequest<B> {
  id: number;
  board: B;
  difficulty: Difficulty;
}
export interface AiResponse {
  id: number;
  move: number;
}

type Mover<B> = (board: B, difficulty: Difficulty) => Promise<number>;

/**
 * Page side. `makeWorker` must contain the literal `new Worker(new URL('./x.worker.ts', import.meta.url))`
 * so Vite can bundle the worker. If workers are unavailable or fail, `fallback` runs on the main thread.
 */
export function workerMover<B>(makeWorker: () => Worker, fallback: Mover<B>): Mover<B> {
  let worker: Worker | null = null;
  let failed = false;
  let nextId = 1;
  const pending = new Map<number, (move: number) => void>();

  function getWorker(): Worker | null {
    if (failed || typeof Worker === 'undefined') return null;
    if (!worker) {
      try {
        worker = makeWorker();
        worker.onmessage = (e: MessageEvent<AiResponse>) => {
          pending.get(e.data.id)?.(e.data.move);
          pending.delete(e.data.id);
        };
        worker.onerror = () => {
          // Fall back to the main thread for this and every later request.
          failed = true;
          worker = null;
          const waiting = [...pending.values()];
          pending.clear();
          waiting.forEach((resolve) => resolve(-1));
        };
      } catch {
        failed = true;
        return null;
      }
    }
    return worker;
  }

  return async (board, difficulty) => {
    const w = getWorker();
    if (!w) return fallback(board, difficulty);
    const id = nextId++;
    const move = await new Promise<number>((resolve) => {
      pending.set(id, resolve);
      const req: AiRequest<B> = { id, board, difficulty };
      w.postMessage(req);
    });
    return move >= 0 ? move : fallback(board, difficulty);
  };
}

/** Worker side: answer each request with `choose`. */
export function serveMoves<B>(choose: (board: B, difficulty: Difficulty) => number) {
  const ctx = self as unknown as Worker;
  ctx.onmessage = (e: MessageEvent<AiRequest<B>>) => {
    const { id, board, difficulty } = e.data;
    const reply: AiResponse = { id, move: choose(board, difficulty) };
    ctx.postMessage(reply);
  };
}
