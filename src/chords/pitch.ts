import type { Six } from "./types";
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export function midiForString(frets: Six<number>, stringIndex: number): number | null {
  const fret = frets[stringIndex];
  return fret === undefined || fret < 0 ? null : OPEN_MIDI[stringIndex] + fret;
}
export function midiForFrets(frets: Six<number>): number[] {
  return frets.flatMap((fret, string) =>
    fret < 0 ? [] : [OPEN_MIDI[string] + fret],
  );
}
export function positionOf(frets: Six<number>): number {
  return Math.min(
    ...frets.filter((f) => f > 0),
    0 === Math.max(...frets) ? 0 : Infinity,
  );
}
