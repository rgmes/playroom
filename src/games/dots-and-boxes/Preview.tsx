import { motion } from 'motion/react';
import { Mark } from '../../components/Mark';
import type { MarkSet } from '../../marks/library';

// A little 3x3 scene for the hub card: a few lines, two claimed boxes and one line drawing in.
const U = 100;
const P = 20;
const at = (n: number) => P + n * U;
// [x1, y1, x2, y2, player] in dot coordinates.
const LINES: [number, number, number, number, 0 | 1][] = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 1],
  [0, 0, 0, 1, 1],
  [1, 0, 1, 1, 0],
  [1, 0, 2, 0, 1],
  [2, 0, 2, 1, 0],
  [1, 1, 2, 1, 0],
  [2, 2, 3, 2, 1],
  [3, 1, 3, 2, 0],
  [0, 2, 0, 3, 1],
];
const NEW: [number, number, number, number] = [1, 2, 1, 3];
const BOXES: [number, number, 0 | 1][] = [
  [0, 0, 0],
  [1, 0, 1],
];

export function DotsPreview({ set }: { set: MarkSet }) {
  const colours = {
    '--p0-light': set.marks[0].color.light,
    '--p0-dark': set.marks[0].color.dark,
    '--p1-light': set.marks[1].color.light,
    '--p1-dark': set.marks[1].color.dark,
  } as React.CSSProperties;
  return (
    <svg className="preview-dab dab-svg" viewBox={`0 0 ${3 * U + 2 * P} ${3 * U + 2 * P}`} style={colours}>
      {BOXES.map(([c, r, p]) => (
        <g key={`${c}-${r}`} className={`dab-box p${p}`}>
          <rect x={at(c) + 9} y={at(r) + 9} width={U - 18} height={U - 18} rx={14} />
          <svg x={at(c) + 22} y={at(r) + 22} width={U - 44} height={U - 44} viewBox="0 0 100 100" overflow="visible">
            <Mark mark={set.marks[p]} draw delay={0.5 + c * 0.4} strokeScale={1.2} />
          </svg>
        </g>
      ))}
      {LINES.map(([x1, y1, x2, y2, p], i) => (
        <line key={i} className={`dab-line p${p}`} x1={at(x1)} y1={at(y1)} x2={at(x2)} y2={at(y2)} />
      ))}
      <motion.line
        className="dab-line p0"
        x1={at(NEW[0])}
        y1={at(NEW[1])}
        x2={at(NEW[2])}
        y2={at(NEW[3])}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 1.2, repeat: Infinity, repeatDelay: 2.2 }}
      />
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} className="dab-dot" cx={at(i % 4)} cy={at(Math.floor(i / 4))} r={10} />
      ))}
    </svg>
  );
}
