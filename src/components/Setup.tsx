import { motion } from 'motion/react';
import { useId } from 'react';
import { MARK_SETS, getMarkSet } from '../marks/library';
import type { AnyGameDef } from '../games/registry';
import type { Player } from '../games/types';
import { go, href } from '../router';
import type { Action, Settings } from '../state/store';
import { Mark } from './Mark';
import { Segmented } from './Segmented';
import { Title } from './Title';

interface Props {
  def: AnyGameDef;
  settings: Settings;
  dispatch: React.Dispatch<Action>;
}

export function Setup({ def, settings, dispatch }: Props) {
  const set = getMarkSet(settings.markSetId);
  const setName = useId();
  const sideName = useId();
  const update = (patch: Partial<Settings>) => dispatch({ type: 'settings', patch });

  return (
    <div className="home">
      <header className="game-header">
        <motion.a className="btn btn-ghost" href={href.hub} whileTap={{ scale: 0.94 }}>
          <span aria-hidden="true">←</span> Playroom
        </motion.a>
      </header>
      <Title text={def.name} small />

      <div className="card settings">
        <Segmented
          legend="Mode"
          value={settings.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'cpu', label: 'vs Computer' },
            { value: 'pvp', label: '2 Players' },
          ]}
        />

        {settings.mode === 'cpu' && (
          <Segmented
            legend="Difficulty"
            value={settings.difficulty}
            onChange={(difficulty) => update({ difficulty })}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
          />
        )}
        {settings.mode === 'cpu' && settings.difficulty === 'hard' && (
          <p className="field-note">{def.hardNote}</p>
        )}

        {def.Options && <def.Options settings={settings} update={update} />}

        <fieldset className="field">
          <legend className="field-label">Marks</legend>
          <div className="set-grid">
            {MARK_SETS.map((s) => {
              const checked = s.id === settings.markSetId;
              return (
                <motion.label
                  key={s.id}
                  className={`set-card ${checked ? 'is-checked' : ''}`}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={setName}
                    value={s.id}
                    checked={checked}
                    onChange={() => update({ markSetId: s.id })}
                  />
                  <span className="set-marks">
                    {/* Re-key on selection so the marks re-draw. */}
                    <Mark key={`${s.id}-a-${checked}`} mark={s.marks[0]} draw={checked} />
                    <span className="set-vs" aria-hidden="true">vs</span>
                    <Mark key={`${s.id}-b-${checked}`} mark={s.marks[1]} draw={checked} delay={0.3} />
                  </span>
                  <span className="set-name">
                    {s.name}
                    <span className="sr-only">
                      : {s.marks[0].name} versus {s.marks[1].name}
                    </span>
                  </span>
                </motion.label>
              );
            })}
          </div>
        </fieldset>

        {settings.mode === 'cpu' && (
          <fieldset className="field">
            <legend className="field-label">You play as</legend>
            <div className="side-picker">
              {([0, 1] as Player[]).map((p) => {
                const checked = settings.humanSide === p;
                const mark = set.marks[p];
                return (
                  <motion.label
                    key={p}
                    className={`side-card ${checked ? 'is-checked' : ''}`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={sideName}
                      checked={checked}
                      onChange={() => update({ humanSide: p })}
                    />
                    <Mark mark={mark} draw={false} />
                    <span>
                      <span className="side-name">{mark.name}</span>
                      <span className="side-note">{p === 0 ? 'Goes first' : 'Goes second'}</span>
                    </span>
                  </motion.label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <motion.button
        className="btn btn-primary btn-big"
        onClick={() => go(href.play(def.id))}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
      >
        Play!
      </motion.button>
    </div>
  );
}
