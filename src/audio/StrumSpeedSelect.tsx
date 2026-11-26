import type { StrumSpeed } from "./guitar";

export function StrumSpeedSelect({
  speed,
  onChange,
}: {
  speed: StrumSpeed;
  onChange: (speed: StrumSpeed) => void;
}) {
  return (
    <label className="strum-speed">
      Strum speed
      <select
        value={speed}
        onChange={(event) => onChange(event.currentTarget.value as StrumSpeed)}
      >
        <option value="slow">Slow</option>
        <option value="normal">Normal</option>
        <option value="together">Together</option>
      </select>
    </label>
  );
}
