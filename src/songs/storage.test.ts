import { expect, test, beforeEach } from "vitest";
import { readLibrary, writeLibrary, STORAGE_KEY } from "./storage";
import { newSong, addSection, addChord } from "./commands";
import { catalog } from "../chords/catalog";
beforeEach(() => localStorage.clear());
test("empty storage and valid save roundtrip", () => {
  expect(readLibrary(localStorage)).toEqual({
    kind: "ok",
    library: { version: 1, songs: [] },
  });
  let song = addSection(newSong("Idea"), "Verse");
  song = addChord(song, song.sections[0].id, catalog[0].id);
  const library = { version: 1 as const, songs: [song] };
  expect(writeLibrary(localStorage, library)).toEqual({ ok: true });
  expect(readLibrary(localStorage)).toEqual({ kind: "ok", library });
});
test.each([
  "{bad",
  '{"version":2,"songs":[]}',
  JSON.stringify({ version: 1, songs: [{ id: "bad" }] }),
])("preserves unreadable raw data %s", (raw) => {
  localStorage.setItem(STORAGE_KEY, raw);
  expect(readLibrary(localStorage).kind).toBe("error");
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
});
test("rejects missing references and duplicated IDs", () => {
  let song = addSection(newSong("Idea"), "Verse");
  song = addChord(song, song.sections[0].id, "missing");
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, songs: [song] }),
  );
  expect(readLibrary(localStorage).kind).toBe("error");
  song = addSection(newSong("Idea"), "Verse");
  song = addChord(song, song.sections[0].id, catalog[0].id);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, songs: [song, song] }),
  );
  expect(readLibrary(localStorage).kind).toBe("error");
});
test("denied reads and quota errors return explicit failures", () => {
  const storage = {
    getItem() {
      throw new Error("Denied");
    },
    setItem() {
      throw new Error("Full");
    },
  };
  expect(readLibrary(storage).kind).toBe("error");
  expect(writeLibrary(storage, { version: 1, songs: [] }).ok).toBe(false);
});
