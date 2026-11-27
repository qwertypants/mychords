import { expect, test } from "vitest";
import { chordTone } from "./chordTones";

test.each([
  ["major", ["R", "", "", "", "3", "", "", "5", "", "", "", ""]],
  ["minor", ["R", "", "", "♭3", "", "", "", "5", "", "", "", ""]],
  ["dim7", ["R", "", "", "♭3", "", "", "♭5", "", "", "", "", ""]],
  ["aug", ["R", "", "", "", "3", "", "", "", "♯5", "", "", ""]],
  ["sus4", ["R", "", "", "", "", "", "", "5", "", "", "", ""]],
  ["5", ["R", "", "", "", "", "", "", "5", "", "", "", ""]],
  ["7#9", ["R", "", "", "", "3", "", "", "5", "", "", "", ""]],
  ["9#11", ["R", "", "", "", "3", "", "", "5", "", "", "", ""]],
  ["m7b5", ["R", "", "", "♭3", "", "", "♭5", "", "", "", "", ""]],
  ["maj7#5", ["R", "", "", "", "3", "", "", "", "♯5", "", "", ""]],
  ["/E", ["R", "", "", "", "3", "", "", "5", "", "", "", ""]],
])("%s classifies chord roles across octaves without coloring extensions", (suffix, expected) => {
  for (const octave of [48, 60, 72]) {
    expect(Array.from({ length: 12 }, (_, i) => chordTone(octave + i, { root: "C", suffix })?.label ?? "")).toEqual(expected);
  }
});

test("roles follow the chord root, including accidentals and slash chords", () => {
  expect(chordTone(61, { root: "C#", suffix: "minor" })?.label).toBe("R");
  expect(chordTone(66, { root: "Eb", suffix: "minor" })?.label).toBe("♭3");
  expect(chordTone(57, { root: "C", suffix: "/A" })).toBeNull();
});
