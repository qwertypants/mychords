import { roots } from "./catalog";
import type { Voicing } from "./types";

export type ChordTone = {
  role: "root" | "third" | "fifth";
  label: "R" | "3" | "♭3" | "5" | "♭5" | "♯5";
  description: string;
};

export function chordTone(midi: number, voicing: Pick<Voicing, "root" | "suffix">): ChordTone | null {
  const interval = (midi - roots.indexOf(voicing.root) + 120) % 12;
  const quality = voicing.suffix.split("/")[0];
  if (interval === 0) return { role: "root", label: "R", description: "root" };
  const suspended = quality.includes("sus") || quality === "5";
  const minor = quality === "minor" || (quality.startsWith("m") && !quality.startsWith("maj")) || quality.startsWith("dim");
  if (!suspended && interval === (minor ? 3 : 4)) {
    return { role: "third", label: minor ? "♭3" : "3", description: minor ? "minor third" : "major third" };
  }
  const flatFifth = quality.includes("b5") || quality.startsWith("dim") || quality === "alt";
  const sharpFifth = quality.startsWith("aug") || quality.includes("#5");
  if (interval === (flatFifth ? 6 : sharpFifth ? 8 : 7)) {
    return { role: "fifth", label: flatFifth ? "♭5" : sharpFifth ? "♯5" : "5", description: flatFifth ? "diminished fifth" : sharpFifth ? "augmented fifth" : "perfect fifth" };
  }
  return null;
}
