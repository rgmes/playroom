import { motion, useReducedMotion } from 'motion/react';
import type { MarkDef } from '../marks/library';

interface Props {
  mark: MarkDef;
  /** Animate the strokes drawing in. */
  draw?: boolean;
  /** Seconds to wait before drawing starts. */
  delay?: number;
  className?: string;
  /** Multiplies stroke width, for small sizes such as marks on discs. */
  strokeScale?: number;
}

const STROKE_TIME = 0.28;

/** An SVG mark. Colour comes from CSS custom properties set here. */
export function Mark({ mark, draw = true, delay = 0, className, strokeScale = 1 }: Props) {
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  const style = {
    '--mark-light': mark.color.light,
    '--mark-dark': mark.color.dark,
  } as React.CSSProperties;
  const total = mark.paths.length * STROKE_TIME;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`mark ${className ?? ''}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {mark.paths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill={mark.fill && i === 0 ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={(mark.stroke ?? 11) * strokeScale}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0, fillOpacity: 0 } : false}
          animate={{ pathLength: 1, fillOpacity: mark.fill && i === 0 ? 1 : 0 }}
          transition={{
            pathLength: { delay: delay + i * STROKE_TIME, duration: STROKE_TIME, ease: 'easeOut' },
            fillOpacity: { delay: delay + total, duration: 0.25 },
          }}
        />
      ))}
    </svg>
  );
}
