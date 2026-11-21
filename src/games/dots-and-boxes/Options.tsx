import { motion } from 'motion/react';
import type { Settings } from '../../state/store';
import { MAX_SIZE, MIN_SIZE, clampSize, type Size } from './logic';

const PRESETS: { label: string; size: Size }[] = [
  { label: 'Small', size: { cols: 4, rows: 4 } },
  { label: 'Medium', size: { cols: 6, rows: 6 } },
  { label: 'Large', size: { cols: 10, rows: 10 } },
  { label: 'Sheet', size: { cols: 16, rows: 15 } },
];

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

/** Board size picker for the setup screen: presets plus a stepper for each side. */
export function DotsOptions({ settings, update }: Props) {
  const size = clampSize(settings.sizes['dots-and-boxes']);
  const set = (s: Size) => update({ sizes: { ...settings.sizes, 'dots-and-boxes': clampSize(s) } });

  return (
    <fieldset className="field">
      <legend className="field-label">Board size</legend>
      <div className="size-presets">
        {PRESETS.map((p) => {
          const active = p.size.cols === size.cols && p.size.rows === size.rows;
          return (
            <motion.button
              key={p.label}
              type="button"
              className={`size-chip ${active ? 'is-checked' : ''}`}
              aria-pressed={active}
              onClick={() => set(p.size)}
              whileTap={{ scale: 0.94 }}
            >
              <span className="size-chip-name">{p.label}</span>
              <span className="size-chip-dims">
                {p.size.cols}×{p.size.rows}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="size-steppers">
        <Stepper label="Across" value={size.cols} onChange={(cols) => set({ ...size, cols })} />
        <span className="size-times" aria-hidden="true">
          ×
        </span>
        <Stepper label="Down" value={size.rows} onChange={(rows) => set({ ...size, rows })} />
      </div>
      <p className="field-note size-note">
        {size.cols * size.rows} boxes · {(size.cols + 1) * (size.rows + 1)} dots
      </p>
    </fieldset>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const lower = label.toLowerCase();
  return (
    <div className="stepper" role="group" aria-label={`Boxes ${lower}`}>
      <span className="stepper-label" aria-hidden="true">
        {label}
      </span>
      <div className="stepper-row">
        <motion.button
          type="button"
          className="stepper-btn"
          aria-label={`Fewer boxes ${lower}`}
          disabled={value <= MIN_SIZE}
          onClick={() => onChange(value - 1)}
          whileTap={{ scale: 0.88 }}
        >
          −
        </motion.button>
        <output className="stepper-value" aria-live="polite" aria-label={`${value} boxes ${lower}`}>
          {value}
        </output>
        <motion.button
          type="button"
          className="stepper-btn"
          aria-label={`More boxes ${lower}`}
          disabled={value >= MAX_SIZE}
          onClick={() => onChange(value + 1)}
          whileTap={{ scale: 0.88 }}
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
