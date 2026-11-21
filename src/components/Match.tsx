import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect } from 'react';
import type { AnyGameDef } from '../games/registry';
import { other } from '../games/types';
import type { Player } from '../games/types';
import { getMarkSet } from '../marks/library';
import type { MarkDef } from '../marks/library';
import { go, href } from '../router';
import type { Action, AppState, Match as MatchT } from '../state/store';
import { Mark } from './Mark';

interface Props {
  def: AnyGameDef;
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
/** Minimum time the computer "thinks", so its moves don't feel instant. */
const MIN_THINK_MS = 450;
/** Shorter pause when the computer moves again in the same turn (taking a chain of boxes). */
const AGAIN_THINK_MS = 170;

const prefersDark = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

/** Route component: starts a fresh match on entry and ends it on exit. */
export function PlayScreen({ def, state, dispatch }: Props) {
  useLayoutEffect(() => {
    dispatch({ type: 'start', game: def.id });
    return () => dispatch({ type: 'stop' });
  }, [def.id, dispatch]);

  if (!state.match || state.match.game !== def.id) return null;
  return <Match def={def} state={state} match={state.match} dispatch={dispatch} />;
}

function Match({ def, state, match, dispatch }: Props & { match: MatchT }) {
  const { board, gameId, lastCell } = match;
  const { mode, difficulty, humanSide } = state.settings;
  const marks = getMarkSet(state.settings.markSetId).marks;
  const result = def.rules.outcome(board);
  const turn = def.rules.turn(board);
  const cpuSide = other(humanSide);
  const isCpuTurn = mode === 'cpu' && result.kind === 'playing' && turn === cpuSide;
  const humanCanMove = result.kind === 'playing' && !isCpuTurn;
  const last = lastCell !== null ? def.describeMove(board, lastCell, marks, mode === 'cpu') : null;
  // Same player again (Dots & Boxes: closing a box earns another line).
  const again = !!def.againNote && result.kind === 'playing' && last !== null && last.player === turn;

  // Computer move. Cancelled on new game / leaving / unmount; the reducer also drops
  // it if gameId changed in between.
  useEffect(() => {
    if (!isCpuTurn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    def.pickMove(board, difficulty).then((move) => {
      if (cancelled) return;
      const think = again ? AGAIN_THINK_MS + Math.random() * 60 : MIN_THINK_MS + Math.random() * 250;
      const wait = think - (performance.now() - started);
      timer = setTimeout(() => dispatch({ type: 'move', move, gameId }), Math.max(0, wait));
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isCpuTurn, again, board, difficulty, gameId, dispatch, def]);

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
  const nameFor = (p: Player) => (mode === 'cpu' ? (p === humanSide ? 'You' : 'Computer') : marks[p].name);

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
    if (isCpuTurn) status = again ? 'Computer goes again…' : 'Computer is thinking…';
    else status = again ? `${def.againNote} Go again` : 'Your turn';
  } else {
    status = again ? `${def.againNote} ${marks[turn].name} goes again` : `${marks[turn].name}'s turn`;
  }

  const points: [number, number] | null = def.points ? def.points(board) : null;

  // Screen readers also hear what was just played.
  let announcement = status;
  if (last) {
    const who = mode === 'cpu' ? (last.player === humanSide ? 'You' : 'Computer') : marks[last.player].name;
    announcement = `${who} ${last.text}. ${status}`;
  }
  if (points && result.kind !== 'playing') {
    announcement += ` Boxes: ${nameFor(0)} ${points[0]}, ${nameFor(1)} ${points[1]}.`;
  }

  const tally = state.scores[def.id][mode];
  const leftSlot: Player = mode === 'cpu' ? humanSide : 0;
  const rightSlot: Player = mode === 'cpu' ? cpuSide : 1;
  const statusMark: MarkDef | null =
    result.kind === 'win' ? marks[result.player] : result.kind === 'playing' ? marks[turn] : null;
  const BoardView = def.Board;

  return (
    <div className="game">
      <header className="game-header">
        <motion.button className="btn btn-ghost" onClick={() => go(href.setup(def.id))} whileTap={{ scale: 0.94 }}>
          <span aria-hidden="true">←</span> Menu
        </motion.button>
        <span className="game-mode">
          <span className="game-name">{def.name}</span>
          {mode === 'cpu' ? ` · vs Computer · ${DIFFICULTY_LABEL[difficulty]}` : ' · 2 Players'}
        </span>
      </header>

      <section className="scoreboard" aria-label="Scores">
        <ScoreTile
          label={nameFor(leftSlot)}
          mark={marks[leftSlot]}
          value={tally.a}
          active={result.kind === 'playing' && turn === leftSlot}
        />
        <ScoreTile label="Draws" value={tally.draws} active={false} />
        <ScoreTile
          label={nameFor(rightSlot)}
          mark={marks[rightSlot]}
          value={tally.b}
          active={result.kind === 'playing' && turn === rightSlot}
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

      {points && (
        <div className="points" aria-label="Boxes this game">
          {([leftSlot, rightSlot] as Player[]).map((p) => (
            <span
              key={p}
              className={`points-pill ${result.kind === 'playing' && turn === p ? 'is-active' : ''}`}
            >
              <Mark mark={marks[p]} draw={false} className="points-mark" />
              <span className="points-name">{nameFor(p)}</span>
              <motion.span
                key={points[p]}
                className="points-value"
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                {points[p]}
              </motion.span>
              <span className="sr-only"> {points[p] === 1 ? 'box' : 'boxes'}</span>
            </span>
          ))}
        </div>
      )}

      <BoardView
        board={board}
        marks={marks}
        preview={humanCanMove ? marks[turn] : null}
        result={result}
        gameId={gameId}
        lastCell={lastCell}
        onPlay={(move) => dispatch({ type: 'move', move, gameId })}
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
          onClick={() => dispatch({ type: 'resetScores', game: def.id })}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
        >
          Reset scores
        </motion.button>
      </div>
    </div>
  );
}

function ScoreTile({ label, value, mark, active }: { label: string; value: number; mark?: MarkDef; active: boolean }) {
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
