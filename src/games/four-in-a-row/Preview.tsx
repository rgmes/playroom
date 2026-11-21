import { motion } from 'motion/react';
import { Disc } from '../../components/Disc';
import type { MarkSet } from '../../marks/library';

// A little 5x4 scene for the hub card: a few stacked discs with one dropping in.
const SCENE: (0 | 1 | null)[][] = [
  [null, null, null, null, null],
  [null, null, 0, null, null],
  [null, 1, 1, 0, null],
  [1, 0, 0, 1, 0],
];

export function FourInARowPreview({ set }: { set: MarkSet }) {
  return (
    <span className="preview-c4">
      {SCENE.flatMap((row, r) =>
        row.map((p, c) => (
          <span key={`${r}-${c}`} className="preview-c4-slot">
            {p !== null && (
              <motion.span
                className="preview-c4-disc"
                initial={{ y: '-400%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.4 + (3 - r) * 0.12 + c * 0.05 }}
              >
                <Disc mark={set.marks[p]} />
              </motion.span>
            )}
          </span>
        )),
      )}
    </span>
  );
}
