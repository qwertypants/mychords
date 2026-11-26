import { useId } from "react";
import type { StrumSpeed } from "./guitar";

const choices = [
  { value: "slow", label: "Slow", stagger: 4 },
  { value: "normal", label: "Normal", stagger: 2 },
  { value: "together", label: "Together", stagger: 0 },
] as const;

export function StrumSpeedSelect({ speed, onChange }: {
  speed: StrumSpeed;
  onChange: (speed: StrumSpeed) => void;
}) {
  const name = useId();
  return (
    <fieldset className="icon-options strum-speed">
      <legend>Strum speed</legend>
      <div className="icon-options-row">
        {choices.map(({ value, label, stagger }) => (
          <label className="icon-option" key={value}>
            <input type="radio" name={name} value={value} checked={speed === value}
              onChange={() => onChange(value)} />
            <span className="icon-option-face">
              <svg viewBox="0 0 48 28" aria-hidden="true" focusable="false">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <path key={i} d={`M${10 + i * stagger} ${4 + i * 4}h8`}
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ))}
              </svg>
              <span>{label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
