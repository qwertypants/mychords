import { useId } from "react";
import type { StrumSpeed } from "./guitar";

const choices = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "together", label: "Together" },
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
        {choices.map(({ value, label }) => (
          <label className="icon-option" key={value}>
            <input type="radio" name={name} value={value} checked={speed === value}
              onChange={() => onChange(value)} />
            <span className="icon-option-face">
              <span>{label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
