import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useReducer } from 'react';
import { initialState, load, reducer, save } from './game/store';
import { Game } from './components/Game';
import { Home } from './components/Home';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(load()));

  const { settings, scores } = state;
  useEffect(() => save({ ...state, settings, scores }), [settings, scores]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="app">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.screen}
            className="screen"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {state.screen === 'home' ? (
              <Home settings={state.settings} dispatch={dispatch} />
            ) : (
              <Game state={state} dispatch={dispatch} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
