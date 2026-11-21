import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mark } from '../../components/Mark';
import type { BoardProps } from '../registry';
import { geometry, isHorizontal, lineDots, type DotsBoard, type Geometry } from './logic';

// Board drawn in an SVG where one box is 100 units, with PAD units around the edge.
const UNIT = 100;
const PAD = 40;
/** Smallest comfortable box on screen (px). Below this, the board zooms in and pans instead. */
const MIN_CELL = 40;
const MAX_CELL = 96;
const ZOOM_STEP = 1.3;

/** Diamond-shaped tap area around a line: reaches the centres of the boxes on each side. */
function hitPath(g: Geometry, line: number): string {
  const [[r1, c1], [r2, c2]] = lineDots(g, line);
  const x1 = PAD + c1 * UNIT;
  const y1 = PAD + r1 * UNIT;
  const x2 = PAD + c2 * UNIT;
  const y2 = PAD + r2 * UNIT;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const h = UNIT / 2;
  return isHorizontal(g, line)
    ? `M${x1} ${y1} L${mx} ${my - h} L${x2} ${y2} L${mx} ${my + h} Z`
    : `M${x1} ${y1} L${mx + h} ${my} L${x2} ${y2} L${mx - h} ${my} Z`;
}

// ---- Keyboard: lines form rows (horizontal row, vertical row, horizontal row, ...). ----------
function toLattice(g: Geometry, line: number): [number, number] {
  if (line < g.hCount) return [2 * Math.floor(line / g.cols), line % g.cols];
  const v = line - g.hCount;
  return [2 * Math.floor(v / (g.cols + 1)) + 1, v % (g.cols + 1)];
}
function fromLattice(g: Geometry, k: number, i: number): number {
  if (k % 2 === 0) return (k / 2) * g.cols + Math.min(i, g.cols - 1);
  return g.hCount + ((k - 1) / 2) * (g.cols + 1) + Math.min(i, g.cols);
}
const rowLength = (g: Geometry, k: number) => (k % 2 === 0 ? g.cols : g.cols + 1);

function describeLine(g: Geometry, line: number): string {
  const [[r1, c1], [r2, c2]] = lineDots(g, line);
  return `Line from row ${r1 + 1}, dot ${c1 + 1} to row ${r2 + 1}, dot ${c2 + 1}`;
}

/** Track the space available for the board: container width and window height. */
function useSpace() {
  const ref = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 360, height: 600 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      // Leave room for the header, scores, status, box count and buttons.
      setSpace({ width: el.clientWidth, height: Math.max(240, window.innerHeight - 390) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return { ref, ...space };
}

export function DotsBoardView({ board, marks, preview, result, gameId, lastCell, onPlay }: BoardProps<DotsBoard>) {
  const { cols, rows } = board;
  const g = geometry(cols, rows);
  const over = result.kind !== 'playing';
  const winner = result.kind === 'win' ? result.player : null;

  // ---- Size and zoom ---------------------------------------------------------------------
  const space = useSpace();
  const avail = space.width - 8; // inside the viewport's border
  const fit = Math.min(MAX_CELL, avail / (cols + 0.8), space.height / (rows + 0.8));
  const [zoom, setZoom] = useState<number | null>(null);
  const cell = zoom ?? Math.max(fit, MIN_CELL);
  const canZoom = fit < 64;
  const viewport = useRef<HTMLDivElement>(null);
  const keepCentre = useRef<[number, number] | null>(null);

  const zoomTo = (next: number) => {
    const v = viewport.current;
    if (v) {
      keepCentre.current = [
        (v.scrollLeft + v.clientWidth / 2) / v.scrollWidth,
        (v.scrollTop + v.clientHeight / 2) / v.scrollHeight,
      ];
    }
    setZoom(Math.min(MAX_CELL, Math.max(fit, next)));
  };
  useLayoutEffect(() => {
    const v = viewport.current;
    const c = keepCentre.current;
    if (!v || !c) return;
    v.scrollLeft = c[0] * v.scrollWidth - v.clientWidth / 2;
    v.scrollTop = c[1] * v.scrollHeight - v.clientHeight / 2;
    keepCentre.current = null;
  }, [cell]);
  // A new board size starts from the automatic zoom again.
  useEffect(() => setZoom(null), [cols, rows]);

  // ---- Hover and focus ---------------------------------------------------------------------
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const hits = useRef<(SVGPathElement | null)[]>([]);
  const focusLine = useCallback((line: number) => {
    setFocused(line);
    setHover(line);
    hits.current[line]?.focus();
  }, []);

  const handleKey = (e: React.KeyboardEvent, line: number) => {
    const [k, i] = toLattice(g, line);
    const lastRow = 2 * rows;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = fromLattice(g, k, Math.max(0, i - 1));
    else if (e.key === 'ArrowRight') next = fromLattice(g, k, Math.min(rowLength(g, k) - 1, i + 1));
    else if (e.key === 'ArrowUp' && k > 0) next = fromLattice(g, k - 1, i);
    else if (e.key === 'ArrowDown' && k < lastRow) next = fromLattice(g, k + 1, i);
    else if (e.key === 'Home') next = fromLattice(g, k, 0);
    else if (e.key === 'End') next = fromLattice(g, k, rowLength(g, k) - 1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (preview && board.lines[line] === null) onPlay(line);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      focusLine(next);
    }
  };

  // ---- Drawing -----------------------------------------------------------------------------
  const width = cell * (cols + 0.8);
  const height = cell * (rows + 0.8);
  const vbW = cols * UNIT + 2 * PAD;
  const vbH = rows * UNIT + 2 * PAD;
  const colours = {
    '--p0-light': marks[0].color.light,
    '--p0-dark': marks[0].color.dark,
    '--p1-light': marks[1].color.light,
    '--p1-dark': marks[1].color.dark,
  } as React.CSSProperties;

  // Boxes closed by the newest line get the claim animation.
  const fresh = new Set<number>();
  if (lastCell !== null) {
    for (let s = 0; s < 2; s++) {
      const b = g.lineBoxes[lastCell * 2 + s];
      if (b >= 0 && board.boxes[b] !== null) fresh.add(b);
    }
  }

  const endpoints = (line: number) => {
    const [[r1, c1], [r2, c2]] = lineDots(g, line);
    return { x1: PAD + c1 * UNIT, y1: PAD + r1 * UNIT, x2: PAD + c2 * UNIT, y2: PAD + r2 * UNIT };
  };

  const showGhost = preview && hover !== null && board.lines[hover] === null;

  return (
    <div className="dab" ref={space.ref}>
      {canZoom && (
        <div className="dab-zoom" role="group" aria-label="Zoom">
          <button type="button" className="btn btn-secondary dab-zoom-btn" onClick={() => zoomTo(cell / ZOOM_STEP)} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            className="btn btn-secondary dab-zoom-btn dab-zoom-fit"
            onClick={() => zoomTo(fit)}
            aria-pressed={cell <= fit + 0.5}
          >
            Whole board
          </button>
          <button type="button" className="btn btn-secondary dab-zoom-btn" onClick={() => zoomTo(cell * ZOOM_STEP)} aria-label="Zoom in">
            +
          </button>
        </div>
      )}
      <div
        ref={viewport}
        className={`dab-viewport ${width > avail + 1 ? 'is-panning' : ''}`}
        style={{ maxHeight: Math.max(space.height, 280) }}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          key={gameId}
          className={`dab-svg ${over ? 'is-over' : ''}`}
          viewBox={`0 0 ${vbW} ${vbH}`}
          width={width}
          height={height}
          style={colours}
          role="group"
          aria-label={`Board, ${cols} by ${rows} boxes`}
        >
          {/* Claimed boxes */}
          {board.boxes.map((owner, b) => {
            if (owner === null) return null;
            const x = PAD + (b % cols) * UNIT;
            const y = PAD + Math.floor(b / cols) * UNIT;
            const cls = `dab-box p${owner} ${fresh.has(b) ? 'is-new' : ''} ${winner === owner ? 'is-win' : ''}`;
            return (
              <g key={b} className={cls}>
                <rect x={x + 9} y={y + 9} width={UNIT - 18} height={UNIT - 18} rx={14} />
                <svg x={x + 22} y={y + 22} width={UNIT - 44} height={UNIT - 44} viewBox="0 0 100 100" overflow="visible">
                  <Mark mark={marks[owner]} draw={fresh.has(b)} delay={0.1} strokeScale={1.1} />
                </svg>
              </g>
            );
          })}

          {/* Last line halo, ghost line under the pointer, drawn lines */}
          {lastCell !== null && board.lines[lastCell] !== null && (
            <line key={`halo-${lastCell}`} className="dab-halo" {...endpoints(lastCell)} />
          )}
          {showGhost && <line className={`dab-line dab-ghost p${board.turn}`} {...endpoints(hover!)} />}
          {board.lines.map((p, l) =>
            p === null ? null : (
              <line
                key={l}
                className={`dab-line p${p} ${l === lastCell ? 'is-new' : ''}`}
                pathLength={l === lastCell ? 1 : undefined}
                {...endpoints(l)}
              />
            ),
          )}

          {/* Dots */}
          {Array.from({ length: (rows + 1) * (cols + 1) }, (_, i) => (
            <circle
              key={i}
              className="dab-dot"
              cx={PAD + (i % (cols + 1)) * UNIT}
              cy={PAD + Math.floor(i / (cols + 1)) * UNIT}
              r={9}
            />
          ))}

          {/* Tap / focus targets, one per line */}
          {board.lines.map((p, l) => {
            const open = p === null;
            const label = `${describeLine(g, l)}, ${open ? 'open' : `drawn by ${marks[p].name}`}`;
            return (
              <path
                key={l}
                ref={(el) => {
                  hits.current[l] = el;
                }}
                className={`dab-hit ${open ? '' : 'is-drawn'}`}
                d={hitPath(g, l)}
                role="button"
                tabIndex={focused === l ? 0 : -1}
                aria-label={label}
                aria-disabled={!open || !preview}
                onClick={() => open && preview && onPlay(l)}
                onKeyDown={(e) => handleKey(e, l)}
                onFocus={(e) => {
                  setFocused(l);
                  if ((e.currentTarget as Element).matches(':focus-visible')) setHover(l);
                }}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(l)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
