import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import type { BoardProps } from '../registry';
import { Mark } from '../../components/Mark';

// Cell centres as % of the board. Must match the grid gap in CSS (--gap: 3%).
const CENTRES = [15.667, 50, 84.333];
const centre = (i: number) => ({ x: CENTRES[i % 3], y: CENTRES[Math.floor(i / 3)] });

/** Line through the winning cells, overshooting the end cells a little. */
function strike([from, to]: [number, number]) {
  const a = centre(from);
  const b = centre(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ex = ((b.x - a.x) / len) * 9;
  const ey = ((b.y - a.y) / len) * 9;
  return { x1: a.x - ex, y1: a.y - ey, x2: b.x + ex, y2: b.y + ey };
}

export function TicTacToeBoard({ board, marks, preview, result, gameId, onPlay }: BoardProps) {
  const [focused, setFocused] = useState(4);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  const over = result.kind !== 'playing';
  const winCells = result.kind === 'win' ? result.cells : null;
  const winLines = result.kind === 'win' ? result.lines : [];

  const wiggle = (i: number) => {
    const el = cellRefs.current[i];
    if (!el || reduce) return;
    animate(el, { x: [0, -7, 7, -5, 5, 0] }, { duration: 0.35 });
  };

  const handleClick = (i: number) => {
    if (board[i] !== null || over || !preview) wiggle(i);
    else onPlay(i);
  };

  const handleKey = (e: React.KeyboardEvent, i: number) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    let next: number | null = null;
    if (e.key === 'ArrowUp') next = ((row + 2) % 3) * 3 + col;
    else if (e.key === 'ArrowDown') next = ((row + 1) % 3) * 3 + col;
    else if (e.key === 'ArrowLeft') next = row * 3 + ((col + 2) % 3);
    else if (e.key === 'ArrowRight') next = row * 3 + ((col + 1) % 3);
    else if (e.key === 'Home') next = row * 3;
    else if (e.key === 'End') next = row * 3 + 2;
    if (next !== null) {
      e.preventDefault();
      setFocused(next);
      cellRefs.current[next]?.focus();
    }
  };

  return (
    <div
      ref={scope}
      className={`board ${over ? 'is-over' : ''} ${result.kind === 'draw' ? 'is-draw' : ''}`}
      role="grid"
      aria-label="Game board"
    >
      {[0, 1, 2].map((r) => (
        <div role="row" className="board-row" key={r}>
          {[0, 1, 2].map((c) => {
            const i = r * 3 + c;
            const v = board[i];
            const mark = v === null ? null : marks[v];
            const isWin = winCells?.includes(i) ?? false;
            const label = `Row ${r + 1}, column ${c + 1}, ${mark ? mark.name : 'empty'}`;
            return (
              <div role="gridcell" className="board-cell" key={c}>
                <button
                  ref={(el) => {
                    cellRefs.current[i] = el;
                  }}
                  className={`cell ${isWin ? 'is-win' : ''} ${mark ? 'is-filled' : ''}`}
                  tabIndex={focused === i ? 0 : -1}
                  aria-label={label}
                  aria-disabled={v !== null || over || !preview}
                  onClick={() => handleClick(i)}
                  onKeyDown={(e) => handleKey(e, i)}
                  onFocus={() => setFocused(i)}
                >
                  {/* Re-keyed per game so tiles pop in on every new game without losing focus. */}
                  <motion.span
                    key={gameId}
                    className="cell-tile"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={
                      isWin
                        ? { scale: [1, 1.12, 1.04], opacity: 1 }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={
                      isWin
                        ? { duration: 0.5, delay: 0.25 + winCells!.indexOf(i) * 0.08 }
                        : { type: 'spring', stiffness: 400, damping: 20, delay: i * 0.035 }
                    }
                  />
                  {mark ? (
                    <motion.span
                      key={`m-${gameId}`}
                      className="cell-mark"
                      initial={{ scale: 0.3, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <Mark mark={mark} />
                    </motion.span>
                  ) : (
                    preview && (
                      <span className="cell-mark cell-ghost">
                        <Mark mark={preview} draw={false} />
                      </span>
                    )
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {winLines.map((line) => (
        <svg key={line.join('-')} className="win-line" viewBox="0 0 100 100" aria-hidden="true">
          <motion.line
            {...strike(line)}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.35, ease: 'easeInOut' }}
          />
        </svg>
      ))}
    </div>
  );
}
