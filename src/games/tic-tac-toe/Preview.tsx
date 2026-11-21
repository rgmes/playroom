import { Mark } from '../../components/Mark';
import type { MarkSet } from '../../marks/library';

// A little 3x3 scene for the hub card, drawn with the player's chosen marks.
const SCENE: (0 | 1 | null)[] = [0, null, 1, null, 0, null, 1, null, 0];

export function TicTacToePreview({ set }: { set: MarkSet }) {
  return (
    <span className="preview-ttt">
      {SCENE.map((p, i) => (
        <span key={i} className="preview-ttt-cell">
          {p !== null && <Mark mark={set.marks[p]} delay={0.5 + i * 0.08} />}
        </span>
      ))}
    </span>
  );
}
