import { readFileSync } from "node:fs";
import { semitones } from "@tonaljs/interval";
export const EXTENDED = JSON.parse(readFileSync(new URL("../src/chords/extended-definitions.json", import.meta.url)));
export function extendedPitches(definition) {
  return definition.intervals.map(interval => semitones(interval) % 12);
}
const TONE_NAMES = { 0: "root", 2: "ninth", 3: "minor third", 4: "major third", 5: "eleventh", 7: "fifth", 9: "thirteenth", 10: "minor seventh", 11: "major seventh" };
export function omissionsFor(v) {
  const definition = EXTENDED.find(d => d.suffix === v.suffix);
  const pcs = new Set(v.frets.flatMap((f, i) => f < 0 ? [] : [([40, 45, 50, 55, 59, 64][i] + f - ROOTS[v.root] + 120) % 12]));
  return extendedPitches(definition).filter(n => !pcs.has(n)).map(n => TONE_NAMES[n]);
}
export const ROOTS = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
export const FORMULAS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  sus: [0, 5, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sus2sus4: [0, 2, 5, 7],
  "7sus4": [0, 5, 7, 10],
  alt: [0, 4, 6],
  aug: [0, 4, 8],
  5: [0, 7],
  6: [0, 4, 7, 9],
  69: [0, 2, 4, 7, 9],
  7: [0, 4, 7, 10],
  "7b5": [0, 4, 6, 10],
  aug7: [0, 4, 8, 10],
  9: [0, 2, 4, 7, 10],
  "9b5": [0, 2, 4, 6, 10],
  aug9: [0, 2, 4, 8, 10],
  "7b9": [0, 1, 4, 7, 10],
  "7#9": [0, 3, 4, 7, 10],
  11: [0, 2, 4, 5, 7, 10],
  "9#11": [0, 2, 4, 6, 7, 10],
  13: [0, 2, 4, 5, 7, 9, 10],
  maj7: [0, 4, 7, 11],
  maj7b5: [0, 4, 6, 11],
  "maj7#5": [0, 4, 8, 11],
  maj7sus2: [0, 2, 7, 11],
  maj9: [0, 2, 4, 7, 11],
  maj11: [0, 2, 4, 5, 7, 11],
  maj13: [0, 2, 4, 5, 7, 9, 11],
  m6: [0, 3, 7, 9],
  m69: [0, 2, 3, 7, 9],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  m9: [0, 2, 3, 7, 10],
  m11: [0, 2, 3, 5, 7, 10],
  mmaj7: [0, 3, 7, 11],
  mmaj7b5: [0, 3, 6, 11],
  mmaj9: [0, 2, 3, 7, 11],
  mmaj11: [0, 2, 3, 5, 7, 11],
  add9: [0, 2, 4, 7],
  madd9: [0, 2, 3, 7],
  add11: [0, 4, 5, 7],
};
export function pitchIssue(v) {
  const [quality, bass] = v.suffix.split("/");
  const extended = EXTENDED.find(d => d.suffix === quality);
  const formula = extended ? extendedPitches(extended) : FORMULAS[quality === "m" ? "minor" : quality || "major"];
  if (!formula) throw new Error(`Unknown quality ${quality}`);
  const midi = v.frets.flatMap((f, i) =>
    f < 0 ? [] : [[40, 45, 50, 55, 59, 64][i] + f],
  );
  const pcs = new Set(midi.map((n) => (n - ROOTS[v.root] + 120) % 12));
  const allowed = new Set(formula);
  if (bass) allowed.add((ROOTS[bass] - ROOTS[v.root] + 12) % 12);
  if ([...pcs].some((n) => !allowed.has(n)))
    return "Contains a pitch outside the named chord";
  if (bass && Math.min(...midi) % 12 !== ROOTS[bass])
    return "Lowest note disagrees with slash bass";
  // Extended guitar grips can omit roots and fifths, but must keep their defining colors.
  const required = formula.filter((n) => ![0, 7].includes(n));
  const essentials = extended ? extended.required :
    formula.length <= 3
      ? formula
      : required.filter(
          (n) =>
            ![2, 5].includes(n) ||
            ((quality.includes("11") || quality === "add11") && n === 5) ||
            ((quality.includes("9") || quality === "69" || quality === "m69") &&
              n === 2),
        );
  if (essentials.some((n) => !pcs.has(n)))
    return "Missing a defining chord tone";
  return null;
}
