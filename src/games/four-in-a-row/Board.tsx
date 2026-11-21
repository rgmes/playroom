import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { Disc } from '../../components/Disc';
import type { BoardProps } from '../registry';
import { COLS, ROWS, colOf, idx, isColumnFull, landingRow, rowOf } from './logic';

// A disc fills 84% of its slot (see .c4-disc inset), so one slot = 1/0.84 disc heights.
const SLOT_IN_DISCS = 100 / 84;

/** Strike line through a winning run, in a 700 x 600 viewBox (100 per slot). */
function strike([from, to]: [number, number]) {
  const p = (i: number) => ({ x: colOf(i) * 100 + 50, y: rowOf(i) * 100 + 50 });
  const a = p(from);
  const b = p(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ex = ((b.x - a.x) / len) * 32;
  const ey = ((b.y - a.y) / len) * 32;
  return { x1: a.x - ex, y1: a.y - ey, x2: b.x + ex, y2: b.y + ey };
}

export function FourInARowBoard({ board, marks, preview, result, gameId, onPlay }: BoardProps) {
  const [focused, setFocused] = useState(3);
  const [hover, setHover] = useState<number | null>(null);
  const colRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  const over = result.kind !== 'playing';
  const winCells = result.kind === 'win' ? result.cells : [];
  const winLines = result.kind === 'win' ? result.lines : [];

  const shake = (c: number) => {
    const el = colRefs.current[c];
    if (!el || reduce) return;
    animate(el, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 });
  };

  const handleClick = (c: number) => {
    if (over || !preview || isColumnFull(board, c)) shake(c);
    else onPlay(c);
  };

  const moveFocus = (c: number) => {
    setFocused(c);
    setHover(c);
    colRefs.current[c]?.focus();
  };

  const handleKey = (e: React.KeyboardEvent, c: number) => {
    const next =
      e.key === 'ArrowLeft' ? (c + COLS - 1) % COLS
      : e.key === 'ArrowRight' ? (c + 1) % COLS
      : e.key === 'Home' ? 0
      : e.key === 'End' ? COLS - 1
      : null;
    if (next !== null) {
      e.preventDefault();
      moveFocus(next);
    }
  };

  const columnLabel = (c: number) => {
    const pieces: string[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = board[idx(r, c)];
      if (v !== null) pieces.push(marks[v].name);
    }
    const empty = ROWS - pieces.length;
    const contents = pieces.length ? ` Bottom to top: ${pieces.join(', ')}.` : '';
    return empty === 0
      ? `Column ${c + 1}, full.${contents}`
      : `Column ${c + 1}, ${empty} empty.${contents}`;
  };

  const showHover = preview && hover !== null && !isColumnFull(board, hover);

  return (
    <div className="c4" onPointerLeave={() => setHover(null)}>
      {/* Hover strip: a disc that slides above the column you're pointing at. */}
      <div className="c4-hover" aria-hidden="true">
        {Array.from({ length: COLS }, (_, c) => (
          <span key={c} className="c4-hover-slot">
            {showHover && hover === c && (
              <motion.span
                layoutId="c4-hover-disc"
                className="c4-hover-disc"
                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
              >
                <motion.span
                  className="c4-hover-bob"
                  animate={{ y: ['0%', '-10%', '0%'] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Disc mark={preview} />
                </motion.span>
              </motion.span>
            )}
          </span>
        ))}
      </div>

      <div className={`c4-frame ${over ? 'is-over' : ''}`}>
        <div ref={scope} className="c4-grid" role="group" aria-label="Board, 7 columns">
          {Array.from({ length: COLS }, (_, c) => {
            const full = isColumnFull(board, c);
            const landing = landingRow(board, c);
            return (
              <button
                key={c}
                ref={(el) => {
                  colRefs.current[c] = el;
                }}
                className="c4-col"
                tabIndex={focused === c ? 0 : -1}
                aria-label={columnLabel(c)}
                aria-disabled={full || over || !preview}
                onClick={() => handleClick(c)}
                onKeyDown={(e) => handleKey(e, c)}
                onFocus={(e) => {
                  setFocused(c);
                  if (e.currentTarget.matches(':focus-visible')) setHover(c);
                }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(c)}
              >
                {Array.from({ length: ROWS }, (_, r) => {
                  const cell = idx(r, c);
                  const v = board[cell];
                  const isWin = winCells.includes(cell);
                  return (
                    <span key={r} className="c4-slot">
                      <span className="c4-hole" />
                      {preview && v === null && r === landing && hover === c && (
                        <span className="c4-disc c4-ghost">
                          <Disc mark={preview} />
                        </span>
                      )}
                      <AnimatePresence>
                        {v !== null && (
                          <motion.span
                            key={`${gameId}-${cell}`}
                            className={`c4-disc ${isWin ? 'is-win' : ''}`}
                            initial={{ y: `${-(r + 1.2) * SLOT_IN_DISCS * 100}%` }}
                            animate={
                              isWin
                                ? { y: '0%', scale: [1, 1.14, 1.06] }
                                : { y: [null, '0%', '-14%', '0%'] }
                            }
                            transition={
                              isWin
                                ? { scale: { duration: 0.5, delay: 0.2 + winCells.indexOf(cell) * 0.07 } }
                                : {
                                    duration: 0.28 + r * 0.05,
                                    times: [0, 0.62, 0.8, 1],
                                    ease: ['easeIn', 'easeOut', 'easeIn'],
                                  }
                            }
                            exit={{
                              y: `${(ROWS - r + 0.5) * SLOT_IN_DISCS * 100}%`,
                              transition: { duration: 0.45, ease: 'easeIn', delay: c * 0.03 + (ROWS - r) * 0.02 },
                            }}
                          >
                            <Disc mark={marks[v]} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  );
                })}
              </button>
            );
          })}

          {winLines.map((line) => (
            <svg key={line.join('-')} className="win-line" viewBox="0 0 700 600" aria-hidden="true">
              <motion.line
                {...strike(line)}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: 0.4, ease: 'easeInOut' }}
              />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}
