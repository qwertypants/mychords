import { useId } from "react";

const choices = [
  { value: "all", label: "Whole neck", start: 0, width: 40 },
  { value: "0", label: "Frets 0–4", start: 0, width: 10 },
  { value: "5", label: "Frets 5–9", start: 10, width: 10 },
  { value: "10", label: "Frets 10–14", start: 20, width: 10 },
  { value: "15", label: "Frets 15–22", start: 30, width: 10 },
] as const;

export function NeckPositionSelect({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="icon-options neck-position">
      <legend>Neck position</legend>
      <div className="icon-options-row">
        {choices.map(choice => (
          <label className="icon-option" key={choice.value}>
            <input type="radio" name={name} value={choice.value} checked={value === choice.value}
              onChange={() => onChange(choice.value)} />
            <span className="icon-option-face">
              <svg viewBox="0 0 48 28" aria-hidden="true" focusable="false">
                <rect x={4 + choice.start} y="4" width={choice.width} height="20"
                  fill="currentColor" opacity="0.25" />
                <path d="M4 4h40v20H4z M14 4v20 M24 4v20 M34 4v20 M4 9h40 M4 14h40 M4 19h40"
                  fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M4 4v20" stroke="currentColor" strokeWidth="3" />
                <path d={`M${4 + choice.start} 26h${choice.width}`}
                  stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>{choice.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
