import { motion } from 'motion/react';

/** Big title whose letters bounce in one after another. */
export function Title({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <h1 className={`title ${small ? 'title-small' : ''}`} aria-label={text}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={`${text}-${i}`}
          aria-hidden="true"
          className="title-letter"
          initial={{ y: -30, opacity: 0, rotate: -12 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14, delay: i * 0.04 }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  );
}
