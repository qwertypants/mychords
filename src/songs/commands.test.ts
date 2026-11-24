import { expect, test } from "vitest";
import {
  newSong,
  addSection,
  addChord,
  moveChord,
  removeSection,
  renameSection,
  removeChord,
} from "./commands";
test("duplicate voicings remain independent and reorder immutably", () => {
  let s = addSection(newSong("Idea"), "Verse");
  const id = s.sections[0].id;
  s = addChord(s, id, "C");
  s = addChord(s, id, "G");
  s = addChord(s, id, "C");
  const before = structuredClone(s),
    entry = s.sections[0].chords[2].id;
  const moved = moveChord(s, id, entry, 0);
  expect(moved.sections[0].chords.map((c) => c.voicingId)).toEqual([
    "C",
    "C",
    "G",
  ]);
  expect(moved.sections[0].chords[0].id).toBe(entry);
  expect(s).toEqual(before);
  expect(moveChord(s, id, "missing", 1)).toEqual(s);
});
test("rename and removal preserve other sections", () => {
  let s = addSection(addSection(newSong("Song"), "Verse"), "Chorus");
  s = renameSection(s, s.sections[0].id, "Intro");
  expect(s.sections.map((x) => x.name)).toEqual(["Intro", "Chorus"]);
  s = addChord(s, s.sections[0].id, "C");
  s = removeChord(s, s.sections[0].id, s.sections[0].chords[0].id);
  expect(s.sections[0].chords).toEqual([]);
  s = removeSection(s, s.sections[0].id);
  expect(s.sections.map((x) => x.name)).toEqual(["Chorus"]);
});
