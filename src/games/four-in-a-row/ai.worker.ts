// Runs the Four in a Row search off the main thread so animations never stutter.
import { chooseMove } from './ai';
import type { Board, Difficulty } from '../types';

export interface AiRequest {
  id: number;
  board: Board;
  difficulty: Difficulty;
}
export interface AiResponse {
  id: number;
  move: number;
}

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, board, difficulty } = e.data;
  const reply: AiResponse = { id, move: chooseMove(board, difficulty) };
  ctx.postMessage(reply);
};
