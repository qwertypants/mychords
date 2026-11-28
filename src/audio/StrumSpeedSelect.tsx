import { useId } from "react";
import { AudioLines, Turtle, Gauge, Zap } from "lucide-react";
import type { StrumSpeed } from "./guitar";

const choices = [
  { value: "slow", label: "Slow", Icon: Turtle },
  { value: "normal", label: "Normal", Icon: Gauge },
  { value: "together", label: "Together", Icon: Zap },
] as const;

export function StrumSpeedSelect({ speed, onChange }: {
  speed: StrumSpeed;
  onChange: (speed: StrumSpeed) => void;
}) {
  const name = useId();
  return (
    <fieldset className="icon-options strum-speed" aria-label="Strum speed">
      <legend><AudioLines size={14} aria-hidden="true" /> Strum speed</legend>
      <div className="icon-options-row">
        {choices.map(({ value, label, Icon }) => (
          <label className="icon-option" key={value} title={label}>
            <input type="radio" name={name} value={value} checked={speed === value}
              aria-label={label} onChange={() => onChange(value)} />
            <span className="icon-option-face">
              <Icon className="strum-speed-icon" size={20} aria-hidden="true" />
              <span className="strum-speed-label">{label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
