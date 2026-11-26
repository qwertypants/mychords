import { expect, test } from "vitest";
import { createId } from "./createId";
import { newSong, addSection, addChord } from "./commands";
import { createShareUrl, readSharedSong } from "./share";

test("songs and shared imports get unique UUIDs without randomUUID", () => {
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  try {
    const song = addSection(newSong("Network idea"), "Verse");
    const populated = addChord(song, song.sections[0].id, "C:major:-1,3,2,0,1,0");
    const imported = readSharedSong(createShareUrl(populated, "http://example.test/"))!;
    const ids = [createId(), populated.id, populated.sections[0].id, populated.sections[0].chords[0].id,
      imported.id, imported.sections[0].id, imported.sections[0].chords[0].id];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(imported.sections[0].chords[0].voicingId).toBe(populated.sections[0].chords[0].voicingId);
  } finally {
    if (original) Object.defineProperty(crypto, "randomUUID", original);
    else Reflect.deleteProperty(crypto, "randomUUID");
  }
});
