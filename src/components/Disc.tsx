import type { MarkDef } from '../marks/library';
import { inkFor } from '../marks/color';
import { Mark } from './Mark';

/** A coloured game piece with the player's mark drawn on it in contrasting ink. */
export function Disc({ mark, draw = false, className }: { mark: MarkDef; draw?: boolean; className?: string }) {
  const style = {
    '--disc-light': mark.color.light,
    '--disc-dark': mark.color.dark,
    '--ink-light': inkFor(mark.color.light),
    '--ink-dark': inkFor(mark.color.dark),
  } as React.CSSProperties;
  return (
    <span className={`disc ${className ?? ''}`} style={style}>
      <span className="disc-mark">
        <Mark mark={mark} draw={draw} strokeScale={1.35} delay={0.2} />
      </span>
    </span>
  );
}
