import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useReducer } from 'react';
import { GAMES } from './games/registry';
import { useRoute } from './router';
import { initialState, reducer } from './state/store';
import { load, save } from './state/storage';
import { Hub } from './components/Hub';
import { PlayScreen } from './components/Match';
import { Setup } from './components/Setup';

const TITLES = { hub: 'Playroom' } as const;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(load()));
  const route = useRoute();

  const { settings, scores } = state;
  useEffect(() => save({ settings, scores }), [settings, scores]);

  const def = route.name === 'hub' ? null : GAMES[route.game];
  useEffect(() => {
    document.title = def ? `${def.name} · Playroom` : TITLES.hub;
  }, [def]);

  // Keep the play screen mounted across re-renders; only the route changes remount it.
  const key = route.name === 'hub' ? 'hub' : `${route.name}:${route.game}`;

  return (
    <MotionConfig reducedMotion="user">
      <main className="app">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            className={`screen ${route.name === 'play' && def?.wide ? 'screen-wide' : ''}`}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {route.name === 'hub' && <Hub markSetId={settings.markSetId} />}
            {route.name === 'setup' && def && <Setup def={def} settings={settings} dispatch={dispatch} />}
            {route.name === 'play' && def && <PlayScreen def={def} state={state} dispatch={dispatch} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
