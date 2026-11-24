import { librarySchema } from "./types";
import type { Library } from "./types";
import { getVoicing } from "../chords/catalog";
export const STORAGE_KEY = "mychords.library.v1";
type Store = Pick<Storage, "getItem" | "setItem">;
export type ReadResult =
  | { kind: "ok"; library: Library }
  | { kind: "error"; message: string; raw: string | null };
function parseLibrary(value: unknown): Library {
  const library = librarySchema.parse(value);
  const ids = new Set<string>();
  for (const song of library.songs) {
    const allIds = [
      song.id,
      ...song.sections.flatMap((s) => [s.id, ...s.chords.map((c) => c.id)]),
    ];
    for (const id of allIds) {
      if (ids.has(id)) throw new Error("Duplicate IDs");
      ids.add(id);
    }
    for (const section of song.sections)
      for (const chord of section.chords)
        if (!getVoicing(chord.voicingId)) throw new Error("Missing voicing");
  }
  return library;
}
export function readLibrary(storage: Store): ReadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return {
      kind: "ok",
      library:
        raw === null
          ? { version: 1, songs: [] }
          : parseLibrary(JSON.parse(raw)),
    };
  } catch {
    return {
      kind: "error",
      message:
        "Your saved library could not be opened. Its stored data has been preserved.",
      raw,
    };
  }
}
export function writeLibrary(
  storage: Store,
  library: Library,
): { ok: true } | { ok: false; message: string } {
  try {
    const parsed = parseLibrary(library);
    storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Could not save on this browser. Your changes are still here. Free some storage and try again.",
    };
  }
}
export const browserStorage: Store = {
  getItem(key) {
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
};
