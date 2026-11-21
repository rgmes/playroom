import { motion } from 'motion/react';
import { GAME_LIST } from '../games/registry';
import { getMarkSet } from '../marks/library';
import { href } from '../router';
import { Title } from './Title';

export function Hub({ markSetId }: { markSetId: string }) {
  const set = getMarkSet(markSetId);
  return (
    <div className="hub">
      <Title text="Playroom" />
      <p className="hub-sub">Pick a game to play</p>
      <ul className="game-grid">
        {GAME_LIST.map((g, i) => (
          <motion.li
            key={g.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.25 + i * 0.08 }}
          >
            <motion.a
              className="card game-card"
              href={href.setup(g.id)}
              whileHover={{ y: -4, rotate: i % 2 ? 0.6 : -0.6 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="game-card-preview" aria-hidden="true">
                <g.Preview set={set} />
              </span>
              <span className="game-card-text">
                <span className="game-card-name">{g.name}</span>
                <span className="game-card-tag">{g.tagline}</span>
              </span>
            </motion.a>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
