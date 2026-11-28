import { expect, test } from "vitest";
import { catalog, findVoicings, roots } from "./catalog";
import { inCategory } from "./browse";
import { midiForFrets, positionOf } from "./pitch";
import { planStrums } from "../audio/guitar";
import { addChord, addSection, newSong } from "../songs/commands";
import { createShareUrl, readSharedSong } from "../songs/share";
import { readLibrary, writeLibrary } from "../songs/storage";
import definitions from "./extended-definitions.json";

const intervals: Record<string, number[]> = {
  m13: [0, 2, 3, 5, 7, 9, 10], m11add13: [0, 2, 3, 5, 7, 9, 10],
  "7add13": [0, 4, 7, 9, 10], maj7add13: [0, 4, 7, 9, 11],
  m7add13: [0, 3, 7, 9, 10], add13: [0, 4, 7, 9],
  madd11: [0, 3, 5, 7], madd13: [0, 3, 7, 9],
};

test.each(["Bm11 add 13", "Bm11(add13)", "Bm11add13", "bm11 ADD13"])("recognizes %s without simplifying its identity", text => {
  const found = findVoicings({ text });
  expect(found.length).toBeGreaterThan(1);
  expect(found.every(v => v.root === "B" && v.suffix === "m11add13")).toBe(true);
});

test("complete chord names match exactly while descriptions remain searchable", () => {
  expect(findVoicings({ text: "Bm13" }).every(v => v.suffix === "m13")).toBe(true);
  expect(findVoicings({ text: "Bm11 add14" })).toEqual([]);
  expect(findVoicings({ text: "D♭m11(add13)" }).every(v => v.root === "C#")).toBe(true);
  expect(findVoicings({ text: "minor thirteenth" }).length).toBeGreaterThan(0);
  expect(findVoicings({ text: "C" })).toEqual(findVoicings({ root: "C" }));
  expect(findVoicings({ text: "C7" }).every(v => v.label === "C7")).toBe(true);
});

test("every new family has two positions in every root and only allowed pitches", () => {
  for (const definition of definitions) for (const root of roots) {
    const shapes = findVoicings({ root, suffix: definition.suffix });
    expect(new Set(shapes.map(v => positionOf(v.frets))).size, `${root}${definition.suffix}`).toBeGreaterThanOrEqual(2);
    for (const shape of shapes) {
      const pcs = midiForFrets(shape.frets).map(n => (n - roots.indexOf(root) + 120) % 12);
      expect(pcs.every(n => intervals[definition.suffix].includes(n))).toBe(true);
      expect(definition.required.every(n => pcs.includes(n))).toBe(true);
    }
  }
});

test("explicit eleventh and thirteenth survive, and omissions describe the actual grip", () => {
  const shape = catalog.find(v => v.id === "B:m11add13:-1,-1,2,2,3,4");
  expect(shape).toBeDefined();
  expect(shape?.label).toBe("Bm11 add13");
  expect(shape?.omissions).toEqual(["root", "fifth", "ninth"]);
  expect(shape && midiForFrets(shape.frets)).toEqual([52, 57, 62, 68]);
  for (const category of ["Minor", "Elevenths", "Thirteenths", "Added notes"] as const)
    expect(inCategory("m11add13", category)).toBe(true);
});


test("new and legacy shapes survive storage and sharing with exact audio pitches", () => {
  const id = "B:m11add13:-1,-1,2,2,3,4";
  const shape = catalog.find(v => v.id === id);
  if (!shape) throw new Error("Missing extended fixture");
  expect(planStrums([{ entryId: "extended", voicing: shape }]).map(e => e.midi)).toEqual([52, 57, 62, 68]);
  let song = addSection(newSong("Colors"), "Verse");
  song = addChord(addChord(song, song.sections[0].id, id), song.sections[0].id, "C:major:-1,3,2,0,1,0");
  const library = { version: 1 as const, songs: [song] };
  const store = { value: "", getItem() { return this.value; }, setItem(_key: string, value: string) { this.value = value; } };
  expect(writeLibrary(store, library)).toEqual({ ok: true });
  expect(readLibrary(store)).toEqual({ kind: "ok", library });
  const copy = readSharedSong(createShareUrl(song, "https://example.test/mychords/"));
  expect(copy?.sections[0].chords.map(c => c.voicingId)).toEqual([id, "C:major:-1,3,2,0,1,0"]);
});
