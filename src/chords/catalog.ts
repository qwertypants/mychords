import { extendedDefinition, normalizeChordSymbol } from "./extended";
import { z } from "zod";
import data from "./voicings.json";
import { voicingSchema } from "./types";
import type { Voicing } from "./types";
import { positionOf } from "./pitch";
export const catalog: readonly Voicing[] = z.array(voicingSchema).parse(data);
const byId = new Map(catalog.map((v) => [v.id, v]));
const symbols = new Map<string, string>();
for (const v of catalog) {
  const names = [v.label, v.root + v.suffix, ...(extendedDefinition(v.suffix)?.aliases ?? []).map(alias => v.root + alias)];
  for (const name of names) symbols.set(normalizeChordSymbol(name), v.root + ":" + v.suffix);
}
export const roots = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
export const suffixes = [...new Set(catalog.map((v) => v.suffix))];
const aliases: Record<string, string> = {
  Db: "C#",
  "D#": "Eb",
  Gb: "F#",
  "G#": "Ab",
  "A#": "Bb",
};
export function getVoicing(id: string): Voicing | undefined {
  return byId.get(id);
}
export function qualityLabel(suffix: string): string {
  const names: Record<string, string> = {
    major: "Major",
    minor: "Minor",
    alt: "Major ♭5",
    sus: "Suspended 4th",
    sus2: "Suspended 2nd", sus4: "Suspended 4th",
    dim: "Diminished", dim7: "Diminished seventh",
    aug: "Augmented", aug7: "Augmented seventh", aug9: "Augmented ninth",
    "5": "Power", "6": "Sixth", "7": "Dominant seventh",
    "9": "Ninth", "11": "Eleventh", "13": "Thirteenth",
    maj7: "Major seventh", maj9: "Major ninth", maj11: "Major eleventh", maj13: "Major thirteenth",
    m7: "Minor seventh", m9: "Minor ninth", m11: "Minor eleventh",
    add9: "Added ninth", add11: "Added eleventh", madd9: "Minor added ninth",

  };
  const [base, bass] = suffix.split("/");
  const extended = extendedDefinition(base);
  if (extended) return bass ? `${extended.name} over ${bass} slash` : extended.name;
  const name = names[base === "m" ? "minor" : base || "major"] ?? base;
  return bass ? `${name} over ${bass} slash` : name;
}
export function findVoicings(query: {
  text?: string;
  root?: string;
  suffix?: string;
  minFret?: number;
  maxFret?: number;
}): Voicing[] {
  let text = (query.text ?? "").trim().replace(/♯/g, "#").replace(/♭/g, "b");
  const rootMatch = /^([a-g])([#b]?)(.*)$/i.exec(text);
  if (rootMatch) {
    const inputRoot = rootMatch[1].toUpperCase() + rootMatch[2];
    text = (aliases[inputRoot] ?? inputRoot) + rootMatch[3];
  }
  const normalized = normalizeChordSymbol(text);
  const rootOnly = /^[a-g][#b]?$/.test(normalized);
  const exactGroup = symbols.get(normalized);
  text = text.toLowerCase();
  const matchesText = (v: Voicing): boolean => {
    if (!text) return true;
    if (rootOnly) return v.root.toLowerCase() === normalized;
    if (exactGroup) return `${v.root}:${v.suffix}` === exactGroup;
    return `${v.label} ${v.root} ${qualityLabel(v.suffix)}`.toLowerCase().includes(text)
      || normalizeChordSymbol(v.label).includes(normalized);
  };
  return catalog.filter(
    (v) =>
      (!query.root || v.root === query.root) &&
      (!query.suffix || v.suffix === query.suffix) &&
      matchesText(v) &&
      positionOf(v.frets) >= (query.minFret ?? 0) &&
      positionOf(v.frets) <= (query.maxFret ?? 22),
  );
}
