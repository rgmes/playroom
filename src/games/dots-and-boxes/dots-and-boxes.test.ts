import { describe, expect, it } from 'vitest';
import type { Cell, Difficulty, Player } from '../types';
import { chooseMove, controlValue } from './ai';
import {
  boxCounts,
  clampSize,
  drawLine,
  emptyBoard,
  geometry,
  lineDots,
  outcome,
  sidesDrawn,
  type DotsBoard,
} from './logic';

/** Small deterministic RNG so games are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lineIds = (cols: number, rows: number) => {
  const hCount = (rows + 1) * cols;
  return {
    H: (r: number, c: number) => r * cols + c,
    V: (r: number, c: number) => hCount + r * (cols + 1) + c,
  };
};

/** A board with the given lines drawn (by player 0) and boxes owned, without playing it out. */
function position(cols: number, rows: number, drawn: number[], owned: [number, Player][] = [], turn: Player = 0) {
  const b = emptyBoard({ cols, rows });
  const lines: Cell[] = b.lines.slice();
  for (const l of drawn) lines[l] = 0;
  const boxes: Cell[] = b.boxes.slice();
  for (const [box, p] of owned) boxes[box] = p;
  return { ...b, lines, boxes, turn };
}

function play(cols: number, rows: number, levels: [Difficulty, Difficulty], rng: () => number) {
  let b: DotsBoard = emptyBoard({ cols, rows });
  while (outcome(b).kind === 'playing') {
    const move = chooseMove(b, levels[b.turn], rng);
    const next = drawLine(b, move);
    if (!next) throw new Error(`illegal move ${move}`);
    b = next.board;
  }
  return b;
}

describe('dots and boxes rules', () => {
  it('numbers lines and boxes consistently', () => {
    const g = geometry(2, 2);
    const { H, V } = lineIds(2, 2);
    expect(g.lineCount).toBe(12);
    expect(g.boxCount).toBe(4);
    expect([...g.boxLines.slice(0, 4)]).toEqual([H(0, 0), H(1, 0), V(0, 0), V(0, 1)]);
    expect([...g.lineBoxes.slice(H(1, 0) * 2, H(1, 0) * 2 + 2)]).toEqual([0, 2]);
    expect([...g.lineBoxes.slice(V(0, 0) * 2, V(0, 0) * 2 + 2)]).toEqual([-1, 0]);
    expect(lineDots(g, V(1, 2))).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('passes the turn unless a box is closed', () => {
    const { H, V } = lineIds(2, 2);
    let b = emptyBoard({ cols: 2, rows: 2 });
    b = drawLine(b, H(0, 0))!.board;
    expect(b.turn).toBe(1);
    b = drawLine(b, H(1, 0))!.board;
    b = drawLine(b, V(0, 0))!.board;
    expect(b.turn).toBe(1);
    const r = drawLine(b, V(0, 1))!;
    expect(r.board.boxes[0]).toBe(1);
    expect(r.board.turn).toBe(1); // extra turn
    expect(sidesDrawn(r.board, geometry(2, 2), 0)).toBe(4);
  });

  it('one line can close two boxes', () => {
    const { H, V } = lineIds(2, 1);
    const b = position(2, 1, [H(0, 0), H(1, 0), V(0, 0), H(0, 1), H(1, 1), V(0, 2)], [], 1);
    const r = drawLine(b, V(0, 1))!;
    expect(r.board.boxes).toEqual([1, 1]);
    expect(r.board.turn).toBe(1);
  });

  it('rejects drawn and out-of-range lines', () => {
    const b = drawLine(emptyBoard({ cols: 2, rows: 2 }), 0)!.board;
    expect(drawLine(b, 0)).toBeNull();
    expect(drawLine(b, -1)).toBeNull();
    expect(drawLine(b, 99)).toBeNull();
  });

  it('decides wins and draws when every line is drawn', () => {
    const g = geometry(2, 1);
    const all = Array.from({ length: g.lineCount }, (_, i) => i);
    expect(outcome(position(2, 1, all, [[0, 0], [1, 1]])).kind).toBe('draw');
    const win = outcome(position(2, 1, all, [[0, 1], [1, 1]]));
    expect(win).toMatchObject({ kind: 'win', player: 1, cells: [0, 1] });
    expect(outcome(position(2, 1, all.slice(1))).kind).toBe('playing');
  });

  it('keeps sizes between 2 and 16', () => {
    expect(clampSize({ cols: 1, rows: 40 })).toEqual({ cols: 2, rows: 16 });
    expect(clampSize({ cols: 3.5 as number, rows: 5 })).toEqual({ cols: 4, rows: 5 });
    expect(emptyBoard({ cols: 16, rows: 15 }).boxes.length).toBe(240);
  });

  it('a full game always ends with every box owned', () => {
    const b = play(5, 3, ['easy', 'easy'], mulberry32(7));
    const [a, c] = boxCounts(b);
    expect(a + c).toBe(15);
  });
});

describe('chain values', () => {
  it('matches hand-worked endgames', () => {
    expect(controlValue([], [])).toBe(0);
    expect(controlValue([3], [])).toBe(3);
    expect(controlValue([3, 3], [])).toBe(2); // keep control: give 2 back, take the last 3
    expect(controlValue([1, 1], [])).toBe(0);
    expect(controlValue([], [4])).toBe(4);
    expect(controlValue([3], [4])).toBe(1);
  });
});

describe('dots and boxes computer', () => {
  const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

  it('every level takes a free box', () => {
    const { H, V } = lineIds(3, 3);
    // Box 0 has three sides; nothing else is takeable.
    const b = position(3, 3, [H(0, 0), H(1, 0), V(0, 0)]);
    for (const d of LEVELS) expect(chooseMove(b, d, () => 0)).toBe(V(0, 1));
  });

  it('Medium and Hard never give a box away while a safe line exists', () => {
    const rng = mulberry32(3);
    let checked = 0;
    for (let game = 0; game < 30; game++) {
      let b = emptyBoard({ cols: 4, rows: 4 });
      while (outcome(b).kind === 'playing') {
        const g = geometry(4, 4);
        const open = b.lines.flatMap((l, i) => (l === null ? [i] : []));
        const safe = open.filter((l) =>
          [0, 1].every((s) => {
            const box = g.lineBoxes[l * 2 + s];
            return box < 0 || sidesDrawn(b, g, box) <= 1;
          }),
        );
        const canTake = b.boxes.some((o, i) => o === null && sidesDrawn(b, g, i) === 3);
        if (safe.length && !canTake) {
          for (const d of ['medium', 'hard'] as Difficulty[]) expect(safe).toContain(chooseMove(b, d, rng));
          checked++;
        }
        b = drawLine(b, chooseMove(b, 'easy', rng))!.board;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  // Two chains of 3 (top and bottom rows of a 3x2 board), all horizontals drawn.
  const { H: H32, V: V32 } = lineIds(3, 2);
  const allH = Array.from({ length: 9 }, (_, i) => i);

  it('Hard keeps control by handing back the last 2 boxes of a chain', () => {
    // The opponent opened the top chain at its left end.
    let b = position(3, 2, [...allH, V32(0, 0)], [], 1);
    expect(chooseMove(b, 'hard', () => 0)).toBe(V32(0, 1)); // take the first box
    b = drawLine(b, V32(0, 1))!.board;
    expect(chooseMove(b, 'hard', () => 0)).toBe(V32(0, 3)); // decline the last two
    expect(chooseMove(b, 'medium', () => 0)).toBe(V32(0, 2)); // Medium just takes
  });

  it('Hard takes everything when there is nothing left to control', () => {
    const { V } = lineIds(3, 1);
    // Single chain of 3, opened, and nothing else on the board.
    let b = position(3, 1, [0, 1, 2, 3, 4, 5, V(0, 0)], [], 1);
    b = drawLine(b, chooseMove(b, 'hard', () => 0))!.board;
    expect(chooseMove(b, 'hard', () => 0)).toBe(V(0, 2));
  });

  it('Hard gives a 2-chain away with its middle line', () => {
    // Top row: a 3-chain. Bottom row: boxes 3 and 4 form a 2-chain that turns down at box 4;
    // box 5 is already owned.
    const b = position(
      3,
      2,
      [...allH.filter((l) => l !== H32(2, 1)), V32(1, 2), V32(1, 3)],
      [[5, 0]],
    );
    expect(chooseMove(b, 'hard', () => 0)).toBe(V32(1, 1));
  });

  it('Hard beats Easy almost every time', () => {
    const rng = mulberry32(11);
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const hardSide: Player = (i % 2) as Player;
      const levels: [Difficulty, Difficulty] = hardSide === 0 ? ['hard', 'easy'] : ['easy', 'hard'];
      const r = outcome(play(4, 4, levels, rng));
      if (r.kind === 'win' && r.player === hardSide) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(9);
  });

  it('Hard beats Medium more often than not', () => {
    const rng = mulberry32(21);
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < 40; i++) {
      const hardSide: Player = (i % 2) as Player;
      const levels: [Difficulty, Difficulty] = hardSide === 0 ? ['hard', 'medium'] : ['medium', 'hard'];
      const r = outcome(play(5, 5, levels, rng));
      if (r.kind === 'win') r.player === hardSide ? wins++ : losses++;
    }
    expect(wins).toBeGreaterThan(losses * 2);
  });

  it('answers quickly on the biggest board', () => {
    const rng = mulberry32(5);
    let b = emptyBoard({ cols: 16, rows: 16 });
    let slowest = 0;
    while (outcome(b).kind === 'playing') {
      const t = performance.now();
      const move = chooseMove(b, b.turn === 0 ? 'hard' : 'medium', rng);
      slowest = Math.max(slowest, performance.now() - t);
      b = drawLine(b, move)!.board;
    }
    // Generous bound: CI runners are slower than a laptop. The worker keeps the page responsive anyway.
    expect(slowest).toBeLessThan(1000);
  });
});
