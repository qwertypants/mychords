import type { Voicing } from "./types";
import { positionOf } from "./pitch";

export const primaryCategories = ["All", "Major", "Minor", "Sevenths", "Suspended"] as const;
export const extraCategories = ["Sixths", "Ninths", "Elevenths", "Thirteenths", "Added notes", "Diminished", "Augmented", "Altered", "Power", "Slash chords"] as const;
export type Category = typeof primaryCategories[number] | typeof extraCategories[number];

const members: Record<Exclude<Category, "All" | "Slash chords">, readonly string[]> = {
  Major: ["major", "6", "69", "maj7", "maj9", "maj11", "maj13", "add9", "add11", "maj7#5", "maj7b5"],
  Minor: ["minor", "m6", "m69", "m7", "m9", "m11", "madd9", "m7b5", "mmaj7", "mmaj9", "mmaj11", "mmaj7b5"],
  Sevenths: ["7", "m7", "maj7", "dim7", "aug7", "m7b5", "7b5", "7b9", "7#9", "7sus4", "maj7#5", "maj7b5", "maj7sus2", "mmaj7", "mmaj7b5"],
  Suspended: ["sus", "sus2", "sus4", "sus2sus4", "7sus4", "maj7sus2"],
  Sixths: ["6", "69", "m6", "m69"],
  Ninths: ["9", "m9", "maj9", "mmaj9", "69", "m69", "add9", "madd9", "7b9", "7#9", "9#11", "9b5", "aug9"],
  Elevenths: ["11", "m11", "maj11", "mmaj11", "add11", "9#11"],
  Thirteenths: ["13", "maj13"],
  "Added notes": ["add9", "add11", "madd9"],
  Diminished: ["dim", "dim7", "m7b5"],
  Augmented: ["aug", "aug7", "aug9", "maj7#5"],
  Altered: ["alt", "7b5", "7b9", "7#9", "9#11", "9b5", "maj7#5", "maj7b5", "mmaj7b5"],
  Power: ["5"],
};

export function inCategory(suffix: string, category: Category): boolean {
  if (category === "All") return true;
  if (category === "Slash chords") return suffix.includes("/");
  const base = suffix.split("/")[0] || "major";
  return members[category].includes(base === "m" ? "minor" : base);
}

export type ChordGroup = { id: string; root: string; label: string; voicings: Voicing[] };
export function groupChords(voicings: readonly Voicing[]): ChordGroup[] {
  const groups = new Map<string, ChordGroup>();
  for (const v of voicings) {
    const id = v.root + ":" + v.suffix;
    const group = groups.get(id) ?? { id, root: v.root, label: v.label, voicings: [] };
    group.voicings.push(v);
    groups.set(id, group);
  }
  return [...groups.values()].map(group => ({
    ...group,
    voicings: group.voicings.sort((a, b) => positionOf(a.frets) - positionOf(b.frets)),
  }));
}
