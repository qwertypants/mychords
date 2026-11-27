import { expect, test, vi } from "vitest";
import {
  newSong,
  addSection,
  addChord,
  moveChord,
  replaceChordVoicing,
  removeSection,
  renameSection,
  removeChord,
} from "./commands";
test.each([0, 0.9])("new songs get a random one or two word name (%s)", (randomValue) => {
  vi.spyOn(Math, "random").mockReturnValue(randomValue);
  try {
    const song = newSong();
    expect(song.name.trim().split(/\s+/)).toHaveLength(randomValue < 0.5 ? 1 : 2);
  } finally {
    vi.restoreAllMocks();
  }
});
test("newSong preserves an explicitly supplied name", () => {
  expect(newSong("Idea").name).toBe("Idea");
});
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
test("changing a shape preserves the chord occurrence and its neighbors", () => {
  let song = addSection(newSong("Idea"), "Verse");
  const sectionId = song.sections[0].id;
  song = addChord(song, sectionId, "C:first");
  song = addChord(song, sectionId, "C:first");
  const [first, second] = song.sections[0].chords;
  const changed = replaceChordVoicing(song, sectionId, first.id, "C:second");
  expect(changed.sections[0].chords).toEqual([
    { id: first.id, voicingId: "C:second" },
    second,
  ]);
  expect(song.sections[0].chords[0].voicingId).toBe("C:first");
  expect(replaceChordVoicing(song, sectionId, "missing", "C:second")).toBe(song);
  expect(replaceChordVoicing(song, sectionId, first.id, "C:first")).toBe(song);
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
