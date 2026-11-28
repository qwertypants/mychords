import { describe, expect, it } from "vitest";
import { catalog } from "../chords/catalog";
import { addChord, addSection, newSong } from "./commands";
import { createShareUrl, MAX_SHARE_URL, readSharedSong } from "./share";

const origin = "https://example.com/mychords/";
function song() {
  const draft = addSection(newSong("Café 🎸 & friends"), "Verse");
  return addSection(addChord(addChord(draft, draft.sections[0].id, catalog[0].id), draft.sections[0].id, catalog[0].id), "");
}
function payload(value: unknown) {
  return origin + "?song=" + btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
describe("song links", () => {
  it("preserves Unicode, ordered sections, duplicates and exact fingerings with fresh IDs", () => {
    const original = song();
    const link = createShareUrl(original, origin + "?other=1#main");
    expect(link.startsWith(origin + "?song=")).toBe(true);
    const copy = readSharedSong(link)!;
    expect(copy.name).toBe(original.name);
    expect(copy.sections.map(s => [s.name, s.chords.map(c => c.voicingId)]))
      .toEqual(original.sections.map(s => [s.name, s.chords.map(c => c.voicingId)]));
    const ids = (s: typeof original) => [s.id, ...s.sections.flatMap(section => [section.id, ...section.chords.map(c => c.id)])];
    expect(ids(copy).every(id => !ids(original).includes(id))).toBe(true);
    expect(new Set(ids(copy)).size).toBe(ids(copy).length);
    expect(readSharedSong(link)!.id).not.toBe(copy.id);
  });
  it("ignores URLs without a song", () => expect(readSharedSong(origin)).toBeNull());
  it.each(["", "!", "a", "e30", "a".repeat(8000)])("rejects malformed or oversized input", encoded => {
    expect(() => readSharedSong(origin + "?song=" + encoded)).toThrow(/invalid/);
  });
  it.each([
    { version: 2, name: "", sections: [] },
    { version: 1, name: "x".repeat(201), sections: [] },
    { version: 1, name: "", sections: [{ name: "", chords: ["missing"] }] },
  ])("rejects unsupported versions and invalid contents", value => {
    expect(() => readSharedSong(payload(value))).toThrow(/invalid/);
  });
  it("rejects duplicate song parameters", () => {
    expect(() => readSharedSong(createShareUrl(song(), origin) + "&song=a")).toThrow();
  });
  it("rejects oversized pasted text before parsing a URL", () => {
    expect(() => readSharedSong("x".repeat(MAX_SHARE_URL + 1))).toThrow(/invalid/);
  });
  it("rejects songs too large without truncation", () => {
    const large = song();
    large.sections = Array.from({ length: 200 }, () => large.sections[0]);
    expect(() => createShareUrl(large, origin)).toThrow(/too large/);
    large.sections = Array.from({ length: 2000 }, () => large.sections[0]);
    expect(() => createShareUrl(large, origin)).toThrow(/too large/);
  });
});
