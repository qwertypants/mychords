import { useId } from "react";

const choices = [
  { value: "all", label: "All", accessibleLabel: "Whole neck" },
  { value: "0", label: "0–4", accessibleLabel: "Frets 0–4" },
  { value: "5", label: "5–9", accessibleLabel: "Frets 5–9" },
  { value: "10", label: "10–14", accessibleLabel: "Frets 10–14" },
  { value: "15", label: "15–22", accessibleLabel: "Frets 15–22" },
] as const;

export function NeckPositionSelect({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="icon-options neck-position">
      <legend>Neck position · frets</legend>
      <div className="icon-options-row">
        {choices.map(choice => (
          <label className="icon-option" key={choice.value}>
            <input type="radio" aria-label={choice.accessibleLabel} name={name} value={choice.value} checked={value === choice.value}
              onChange={() => onChange(choice.value)} />
            <span className="icon-option-face">
              <span>{choice.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
