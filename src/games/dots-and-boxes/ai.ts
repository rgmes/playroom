// Computer opponent for Dots & Boxes.
//
// Vocabulary (standard Dots & Boxes terms):
//  - a *safe* line gives the opponent no box (no box next to it ends up with 3 sides);
//  - a *chain* is a run of boxes with exactly 2 open sides; opening it hands it all over;
//  - a *loop* is a chain that closes on itself;
//  - *keeping control*: when taking a long chain, leave the last 2 boxes (4 in a loop) to the
//    opponent with one line (a "double-dealing" move), so they must open the next chain for you.
//
// Easy   takes most free boxes, otherwise plays almost at random.
// Medium takes every free box, never gives a box away while a safe line exists, and when forced
//        gives away as little as possible.
// Hard   plays like Medium, but also keeps control of the chains and opens chains in the best order.
//        It picks among safe lines at random (no deep search), so a sharp player can still beat it.
import type { Difficulty } from '../types';
import { geometry, type DotsBoard, type Geometry } from './logic';

type Rng = () => number;

/** Mutable position for fast what-if analysis. */
class Pos {
  readonly g: Geometry;
  readonly drawn: Uint8Array;
  readonly sides: Uint8Array;

  constructor(board: DotsBoard) {
    this.g = geometry(board.cols, board.rows);
    this.drawn = new Uint8Array(this.g.lineCount);
    this.sides = new Uint8Array(this.g.boxCount);
    board.lines.forEach((l, i) => {
      if (l !== null) this.draw(i);
    });
  }

  /** Box across `line` from `box`, or -1 for the edge of the board. */
  across(line: number, box: number): number {
    const a = this.g.lineBoxes[line * 2];
    return a === box ? this.g.lineBoxes[line * 2 + 1] : a;
  }

  draw(line: number) {
    this.drawn[line] = 1;
    for (let s = 0; s < 2; s++) {
      const b = this.g.lineBoxes[line * 2 + s];
      if (b >= 0) this.sides[b]++;
    }
  }

  undraw(line: number) {
    this.drawn[line] = 0;
    for (let s = 0; s < 2; s++) {
      const b = this.g.lineBoxes[line * 2 + s];
      if (b >= 0) this.sides[b]--;
    }
  }

  openLines(): number[] {
    const out: number[] = [];
    for (let l = 0; l < this.g.lineCount; l++) if (!this.drawn[l]) out.push(l);
    return out;
  }

  /** The open sides of a box. */
  openSides(box: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < 4; i++) {
      const l = this.g.boxLines[box * 4 + i];
      if (!this.drawn[l]) out.push(l);
    }
    return out;
  }

  isSafe(line: number): boolean {
    for (let s = 0; s < 2; s++) {
      const b = this.g.lineBoxes[line * 2 + s];
      if (b >= 0 && this.sides[b] >= 2) return false;
    }
    return true;
  }

  /** Boxes with 3 sides drawn: the player to move can take them. */
  capturable(): number[] {
    const out: number[] = [];
    for (let b = 0; b < this.g.boxCount; b++) if (this.sides[b] === 3) out.push(b);
    return out;
  }

  /**
   * Take every box that can be taken, one after another. Returns the boxes taken and the lines
   * drawn (pass the lines to `undo`).
   */
  takeAll(): { taken: number; lines: number[] } {
    const lines: number[] = [];
    let taken = 0;
    let stack = this.capturable();
    while (stack.length) {
      const b = stack.pop()!;
      if (this.sides[b] !== 3) continue;
      const [l] = this.openSides(b);
      this.draw(l);
      lines.push(l);
      for (let s = 0; s < 2; s++) {
        const x = this.g.lineBoxes[l * 2 + s];
        if (x < 0) continue;
        if (this.sides[x] === 4) taken++;
        else if (this.sides[x] === 3) stack.push(x);
      }
    }
    return { taken, lines };
  }

  undo(lines: number[]) {
    for (let i = lines.length - 1; i >= 0; i--) this.undraw(lines[i]);
  }

  /** How many boxes the opponent could take straight after we draw `line`. */
  giveaway(line: number): number {
    this.draw(line);
    const { taken, lines } = this.takeAll();
    this.undo(lines);
    this.undraw(line);
    return taken;
  }
}

// ---- Chain analysis -----------------------------------------------------------------------

interface Component {
  kind: 'chain' | 'loop';
  boxes: number[];
  /** The line to draw when we have to give this component away. */
  openWith: number;
}

/**
 * Split the board into chains and loops. Only meaningful once no safe line is left: then every
 * open box has 2 open sides (part of a chain or loop) or 3+ (a junction, treated as a chain end).
 */
function components(p: Pos): Component[] {
  const seen = new Uint8Array(p.g.boxCount);
  const inChain = (b: number) => b >= 0 && p.sides[b] === 2;
  const out: Component[] = [];

  for (let start = 0; start < p.g.boxCount; start++) {
    if (seen[start] || !inChain(start)) continue;
    const boxes: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const b = stack.pop()!;
      boxes.push(b);
      for (const l of p.openSides(b)) {
        const n = p.across(l, b);
        if (inChain(n) && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }

    // An end line leads out of the component (to the edge or a junction).
    let endLine = -1;
    for (const b of boxes) {
      for (const l of p.openSides(b)) {
        if (!inChain(p.across(l, b))) {
          endLine = l;
          break;
        }
      }
      if (endLine >= 0) break;
    }

    if (endLine < 0) {
      // Every open side stays inside: a loop. Any inner line opens it.
      out.push({ kind: 'loop', boxes, openWith: p.openSides(boxes[0])[0] });
    } else if (boxes.length === 2) {
      // Give a 2-chain away with its middle line, so the taker can't keep control.
      const [a, b] = boxes;
      const middle = p.openSides(a).find((l) => p.across(l, a) === b)!;
      out.push({ kind: 'chain', boxes, openWith: middle });
    } else {
      out.push({ kind: 'chain', boxes, openWith: endLine });
    }
  }
  return out;
}

const controlMemo = new Map<string, number>();

/** Controller's best net from one component, given the value `v` of what comes after it. */
function takeValue(len: number, loop: boolean, v: number): number {
  if (loop) return Math.max(len - v, len - 8 + v);
  return len >= 3 ? Math.max(len - v, len - 4 + v) : len - v;
}

/** How many different sub-collections the exact search could visit. */
function searchSize(lengths: number[]): number {
  const counts = new Map<number, number>();
  for (const l of lengths) counts.set(l, (counts.get(l) ?? 0) + 1);
  let n = 1;
  for (const c of counts.values()) n *= c + 1;
  return n;
}

/**
 * Net boxes the player in control wins from a set of chains and loops, when the other player
 * must open them one by one (each side playing well). Chains/loops are given by their lengths.
 * Exact for small sets; for very large ones (big boards) assumes the usual order of play:
 * short chains first, then loops, then long chains, smallest first.
 */
export function controlValue(chains: number[], loops: number[]): number {
  if (chains.length === 0 && loops.length === 0) return 0;
  const cs = [...chains].sort((a, b) => a - b);
  const ls = [...loops].sort((a, b) => a - b);
  if (searchSize(cs) * searchSize(ls) > 5000) {
    const order = [
      ...cs.filter((l) => l < 3).map((l) => [l, 0]),
      ...ls.map((l) => [l, 1]),
      ...cs.filter((l) => l >= 3).map((l) => [l, 0]),
    ];
    let v = 0;
    for (let i = order.length - 1; i >= 0; i--) v = takeValue(order[i][0], order[i][1] === 1, v);
    return v;
  }

  const key = `${cs.join(',')}|${ls.join(',')}`;
  const hit = controlMemo.get(key);
  if (hit !== undefined) return hit;

  let best = Infinity;
  cs.forEach((len, i) => {
    if (i > 0 && cs[i - 1] === len) return;
    const v = controlValue([...cs.slice(0, i), ...cs.slice(i + 1)], ls);
    best = Math.min(best, takeValue(len, false, v));
  });
  ls.forEach((len, i) => {
    if (i > 0 && ls[i - 1] === len) return;
    const v = controlValue(cs, [...ls.slice(0, i), ...ls.slice(i + 1)]);
    best = Math.min(best, takeValue(len, true, v));
  });
  if (controlMemo.size > 100_000) controlMemo.clear();
  controlMemo.set(key, best);
  return best;
}

function valueOf(comps: Component[]): number {
  return controlValue(
    comps.filter((c) => c.kind === 'chain').map((c) => c.boxes.length),
    comps.filter((c) => c.kind === 'loop').map((c) => c.boxes.length),
  );
}

// ---- Move choice --------------------------------------------------------------------------

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** Lines giving away the fewest boxes. */
function leastGiveaway(p: Pos, lines: number[]): number[] {
  let best = Infinity;
  let out: number[] = [];
  for (const l of lines) {
    const g = p.giveaway(l);
    if (g < best) {
      best = g;
      out = [l];
    } else if (g === best) out.push(l);
  }
  return out;
}

interface Capture {
  /** Line that takes the box now. */
  take: number;
  /** Line that hands the last boxes over instead, keeping control; -1 if not possible here. */
  decline: number;
  /** Boxes handed over by `decline` (2 for a chain end, 4 for a loop end). */
  give: number;
}

/** Look at a takeable box and what lies behind it. */
function inspectCapture(p: Pos, a: number): Capture {
  const [take] = p.openSides(a);
  const plain = { take, decline: -1, give: 0 };
  const n = p.across(take, a);
  if (n < 0 || p.sides[n] !== 2) return plain;
  const l2 = p.openSides(n).find((l) => l !== take)!;
  const m = p.across(l2, n);
  // Chain end: a, n and then the edge or a junction. Drawing l2 hands over a + n together.
  if (m < 0 || p.sides[m] <= 1) return { take, decline: l2, give: 2 };
  // Loop end: a, n, m, z with z also takeable. Drawing n|m hands over two pairs.
  if (p.sides[m] === 2) {
    const l3 = p.openSides(m).find((l) => l !== l2)!;
    const z = p.across(l3, m);
    if (z >= 0 && z !== a && p.sides[z] === 3) return { take, decline: l2, give: 4 };
  }
  return plain;
}

function hardCapture(p: Pos, boxes: number[], rng: Rng): number {
  const caps = boxes.map((b) => inspectCapture(p, b));
  // Free boxes first; the decision to keep control is made on the very last ones.
  const plain = caps.filter((c) => c.decline < 0);
  if (plain.length) return pick(plain, rng).take;
  // Several separate chain ends to take (the two ends of one loop count as one): take one now,
  // and keep the decision for the last.
  const oneLoop = caps.length === 2 && caps[0].give === 4 && caps[1].give === 4;
  if (caps.length > 1 && !oneLoop) return caps[0].take;

  const c = caps[0];
  // What is left after taking everything?
  const { lines } = p.takeAll();
  const safeLeft = p.openLines().some((l) => p.isSafe(l));
  const v = safeLeft ? 0 : valueOf(components(p));
  p.undo(lines);
  // Keep control only if what we win back later beats the boxes we hand over now.
  return !safeLeft && v > c.give ? c.decline : c.take;
}

function hardOpen(p: Pos, open: number[], rng: Rng): number {
  const comps = components(p);
  if (comps.length === 0) return pick(leastGiveaway(p, open), rng);
  let best = Infinity;
  let choices: number[] = [];
  comps.forEach((c, i) => {
    const rest = comps.filter((_, j) => j !== i);
    const v = valueOf(rest);
    // What the opponent nets if we hand them this one.
    const val = takeValue(c.boxes.length, c.kind === 'loop', v);
    if (val < best) {
      best = val;
      choices = [c.openWith];
    } else if (val === best) choices.push(c.openWith);
  });
  return pick(choices, rng);
}

export function chooseMove(board: DotsBoard, difficulty: Difficulty, rng: Rng = Math.random): number {
  const p = new Pos(board);
  const open = p.openLines();
  if (open.length === 0) return -1;
  const caps = p.capturable();
  const safe = open.filter((l) => p.isSafe(l));

  if (difficulty === 'easy') {
    if (caps.length && rng() < 0.75) return p.openSides(pick(caps, rng))[0];
    if (safe.length && rng() < 0.5) return pick(safe, rng);
    return pick(open, rng);
  }

  if (caps.length) {
    if (difficulty === 'hard') return hardCapture(p, caps, rng);
    return p.openSides(pick(caps, rng))[0];
  }
  if (safe.length) return pick(safe, rng);
  if (difficulty === 'hard') return hardOpen(p, open, rng);
  return pick(leastGiveaway(p, open), rng);
}
