import { expect, test } from "vitest";
import { catalog, findVoicings, suffixes } from "./catalog";
import { extraCategories, primaryCategories, groupChords, inCategory } from "./browse";
import { positionOf } from "./pitch";

test("every catalog suffix is categorized and every shape survives grouping", () => {
  for (const suffix of suffixes)
    expect([...primaryCategories.slice(1), ...extraCategories].some(c => inCategory(suffix, c)), suffix).toBe(true);
  const groups = groupChords(catalog);
  expect(groups.flatMap(g => g.voicings).map(v => v.id).sort()).toEqual(catalog.map(v => v.id).sort());
  for (const group of groups) {
    const positions = group.voicings.map(v => positionOf(v.frets));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  }
});
test("families overlap while slash chord identities stay distinct", () => {
  expect(inCategory("m7", "Minor")).toBe(true);
  expect(inCategory("m7", "Sevenths")).toBe(true);
  expect(inCategory("m/A", "Minor")).toBe(true);
  expect(inCategory("m/A", "Slash chords")).toBe(true);
  const groups = groupChords(findVoicings({ root: "C" }));
  expect(groups.some(g => g.id === "C:major")).toBe(true);
  expect(groups.some(g => g.id === "C:/A")).toBe(true);
  expect(findVoicings({ text: "D♭" }).every(v => v.root === "C#")).toBe(true);
  expect(findVoicings({ text: "minor seventh" }).length).toBeGreaterThan(0);
});
