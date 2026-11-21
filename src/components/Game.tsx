import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { chooseMove } from '../game/ai';
import { currentPlayer, other, outcome } from '../game/logic';
import type { Action, AppState } from '../game/store';
import { getMarkSet } from '../marks/library';
import type { MarkDef } from '../marks/library';
import { Board } from './Board';
import { Mark } from './Mark';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

const cellName = (i: number) => `row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`;

const prefersDark = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

export function Game({ state, dispatch }: Props) {
  const { board, settings, gameId, lastMove } = state;
  const { mode, difficulty, humanSide } = settings;
  const set = getMarkSet(settings.markSetId);
  const marks = set.marks;
  const result = outcome(board);
  const turn = currentPlayer(board);
  const cpuSide = other(humanSide);
  const isCpuTurn = mode === 'cpu' && result.kind === 'playing' && turn === cpuSide;
  const humanCanMove = result.kind === 'playing' && !isCpuTurn;

  // Computer move: delayed for feel, cancelled on new game / menu / unmount, and the
  // reducer drops it if gameId changed in between.
  useEffect(() => {
    if (!isCpuTurn) return;
    const t = setTimeout(
      () => dispatch({ type: 'move', index: chooseMove(board, difficulty), gameId }),
      420 + Math.random() * 280,
    );
    return () => clearTimeout(t);
  }, [isCpuTurn, board, difficulty, gameId, dispatch]);

  // Confetti for wins worth celebrating (any win in 2-player, only your wins vs computer).
  const winPlayer = result.kind === 'win' ? result.player : null;
  useEffect(() => {
    if (winPlayer === null) return;
    if (mode === 'cpu' && winPlayer !== humanSide) return;
    const m = marks[winPlayer];
    const colors = [prefersDark() ? m.color.dark : m.color.light, '#ffd23f', '#ff6b6b', '#4fd39e'];
    const opts = { particleCount: 70, spread: 70, colors, disableForReducedMotion: true, zIndex: 50 };
    const t = setTimeout(() => {
      confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.75 } });
      confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.75 } });
    }, 500);
    return () => clearTimeout(t);
  }, [winPlayer, gameId, mode, humanSide, marks]);

  // ---- Text ------------------------------------------------------------------
  const nameFor = (p: 0 | 1) => (mode === 'cpu' ? (p === humanSide ? 'You' : 'Computer') : marks[p].name);

  let status: string;
  if (result.kind === 'win') {
    status =
      mode === 'cpu'
        ? result.player === humanSide
          ? 'You win!'
          : 'Computer wins!'
        : `${marks[result.player].name} wins!`;
  } else if (result.kind === 'draw') {
    status = "It's a draw!";
  } else if (mode === 'cpu') {
    status = isCpuTurn ? 'Computer is thinking…' : `Your turn`;
  } else {
    status = `${marks[turn].name}'s turn`;
  }

  // Screen readers also hear what was just played.
  let announcement = status;
  if (lastMove !== null && board[lastMove] !== null) {
    const p = board[lastMove]!;
    const who =
      mode === 'cpu'
        ? `${p === humanSide ? 'You' : 'Computer'} played ${marks[p].name}`
        : `${marks[p].name} played`;
    announcement = `${who} at ${cellName(lastMove)}. ${status}`;
  }

  const tally = state.scores[mode];
  const statusMark: MarkDef | null =
    result.kind === 'win' ? marks[result.player] : result.kind === 'playing' ? marks[turn] : null;

  return (
    <div className="game">
      <header className="game-header">
        <motion.button
          className="btn btn-ghost"
          onClick={() => dispatch({ type: 'menu' })}
          whileTap={{ scale: 0.94 }}
        >
          <span aria-hidden="true">←</span> Menu
        </motion.button>
        <span className="game-mode">
          {mode === 'cpu' ? `vs Computer · ${DIFFICULTY_LABEL[difficulty]}` : '2 Players'}
        </span>
      </header>

      <section className="scoreboard" aria-label="Scores">
        <ScoreTile
          label={nameFor(mode === 'cpu' ? humanSide : 0)}
          mark={marks[mode === 'cpu' ? humanSide : 0]}
          value={tally.a}
          active={result.kind === 'playing' && turn === (mode === 'cpu' ? humanSide : 0)}
        />
        <ScoreTile label="Draws" value={tally.draws} active={false} />
        <ScoreTile
          label={nameFor(mode === 'cpu' ? cpuSide : 1)}
          mark={marks[mode === 'cpu' ? cpuSide : 1]}
          value={tally.b}
          active={result.kind === 'playing' && turn === (mode === 'cpu' ? cpuSide : 1)}
        />
      </section>

      <div className="status" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={status + gameId}
            className={`status-text ${result.kind !== 'playing' ? 'is-final' : ''}`}
            initial={{ y: 14, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -14, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {statusMark && <Mark mark={statusMark} draw={false} className="status-mark" />}
            {status}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>

      <Board
        board={board}
        marks={marks}
        preview={humanCanMove ? marks[turn] : null}
        result={result}
        gameId={gameId}
        onPlay={(index) => dispatch({ type: 'move', index, gameId })}
      />

      <div className="game-actions">
        <motion.button
          className={`btn btn-primary ${result.kind !== 'playing' ? 'is-pulsing' : ''}`}
          onClick={() => dispatch({ type: 'newGame' })}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          {result.kind === 'playing' ? 'New game' : 'Play again'}
        </motion.button>
        <motion.button
          className="btn btn-secondary"
          onClick={() => dispatch({ type: 'resetScores' })}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          Reset scores
        </motion.button>
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  mark,
  active,
}: {
  label: string;
  value: number;
  mark?: MarkDef;
  active: boolean;
}) {
  return (
    <div className={`score-tile ${active ? 'is-active' : ''}`}>
      <span className="score-label">
        {mark && <Mark mark={mark} draw={false} className="score-mark" />}
        {label}
        {mark && mark.name !== label && <span className="sr-only"> ({mark.name})</span>}
      </span>
      <motion.span
        key={value}
        className="score-value"
        initial={{ scale: 1.6, y: -4 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      >
        {value}
      </motion.span>
    </div>
  );
}
