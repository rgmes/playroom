import { motion } from 'motion/react';
import { useId } from 'react';

interface Option<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface Props<T extends string> {
  legend: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}

/** Radio group styled as a pill switch. Arrow keys work natively. */
export function Segmented<T extends string>({ legend, value, options, onChange }: Props<T>) {
  const name = useId();
  return (
    <fieldset className="field">
      <legend className="field-label">{legend}</legend>
      <div className="segmented">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label key={o.value} className={`segment ${checked ? 'is-checked' : ''}`}>
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {checked && (
                <motion.span
                  layoutId={`pill-${name}`}
                  className="segment-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="segment-text">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
