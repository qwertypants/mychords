import { z } from "zod";
import data from "./voicings.json";
import { voicingSchema } from "./types";
import type { Voicing } from "./types";
import { positionOf } from "./pitch";
export const catalog: readonly Voicing[] = z.array(voicingSchema).parse(data);
const byId = new Map(catalog.map((v) => [v.id, v]));
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
  };
  return names[suffix] ?? suffix;
}
export function findVoicings(query: {
  text?: string;
  root?: string;
  suffix?: string;
  minFret?: number;
  maxFret?: number;
}): Voicing[] {
  let text = (query.text ?? "").trim().replace(/♯/g, "#").replace(/♭/g, "b");
  for (const [alias, root] of Object.entries(aliases))
    if (text.startsWith(alias)) text = root + text.slice(alias.length);
  text = text.toLowerCase();
  return catalog.filter(
    (v) =>
      (!query.root || v.root === query.root) &&
      (!query.suffix || v.suffix === query.suffix) &&
      (!text ||
        (/^[a-g][#b]?$/.test(text)
          ? v.root.toLowerCase() === text
          : `${v.label} ${v.root} ${qualityLabel(v.suffix)}`
              .toLowerCase()
              .includes(text))) &&
      positionOf(v.frets) >= (query.minFret ?? 0) &&
      positionOf(v.frets) <= (query.maxFret ?? 22),
  );
}
