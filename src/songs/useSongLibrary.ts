import { useState, useEffect, useRef, useCallback } from "react";
import type { Library, Song } from "./types";
import { readLibrary, writeLibrary, browserStorage } from "./storage";
import { newSong, addSection } from "./commands";
import { readSharedSong } from "./share";
export function useSongLibrary(routeId: string | null, onImport: (song: Song) => void) {
  const [initial, setInitial] = useState(() => readLibrary(browserStorage));
  const [library, setLibrary] = useState<Library>(() =>
    initial.kind === "ok" ? initial.library : { version: 1, songs: [] },
  );
  const [draft, setDraft] = useState<Song | null>(() =>
    initial.kind === "ok" && routeId
      ? structuredClone(initial.library.songs.find((song) => song.id === routeId) ?? null)
      : null,
  );
  const [dirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const handledShare = useRef(false);
  const saveDraft = useCallback((song = draft): boolean => {
    if (!song || initial.kind === "error") return false;
    const next: Library = {
      version: 1,
      songs: library.songs.some((s) => s.id === song.id)
        ? library.songs.map((s) => (s.id === song.id ? song : s))
        : [song, ...library.songs],
    };
    const saved = writeLibrary(browserStorage, next);
    if (!saved.ok) {
      setDirty(true);
      setStorageError(saved.message);
      return false;
    }
    setLibrary(next);
    setDirty(false);
    setStorageError(null);
    return true;
  }, [draft, initial.kind, library]);
  useEffect(() => {
    if (initial.kind === "error" || handledShare.current) return;
    handledShare.current = true;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("song")) return;
    let imported: Song | null = null;
    try {
      const song = readSharedSong(url.href);
      if (song) {
        // Consume the external URL once, after storage recovery permits opening it.
        // eslint-disable-next-line react/set-state-in-effect
        setDraft(song);
        saveDraft(song);
        imported = song;
      }
    } catch (error) {
      setShareError((error as Error).message);
    }
    url.searchParams.delete("song");
    window.history.replaceState(window.history.state, "", url);
    if (imported) onImport(imported);
  }, [initial.kind, saveDraft, onImport]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function retry() {
    const result = readLibrary(browserStorage);
    setInitial(result);
    if (result.kind === "ok") {
      setLibrary(result.library);
      setStorageError(null);
    }
  }
  function reset() {
    const empty: Library = { version: 1, songs: [] };
    const result = writeLibrary(browserStorage, empty);
    if (result.ok) {
      setInitial({ kind: "ok", library: empty });
      setLibrary(empty);
    } else setStorageError(result.message);
  }
  function deleteSong(id: string): boolean {
    const next: Library = {
      version: 1,
      songs: library.songs.filter((song) => song.id !== id),
    };
    const result = writeLibrary(browserStorage, next);
    if (!result.ok) {
      setStorageError(result.message);
      return false;
    }
    setLibrary(next);
    if (draft?.id === id) setDraft(null);
    setDirty(false);
    setStorageError(null);
    return true;
  }
  return {
    library,
    shareError,
    draft,
    dirty,
    storageError,
    initial,
    saveDraft,
    retry,
    reset,
    deleteSong,
    openSong: (song: Song) => {
      setDraft(structuredClone(song));
      setDirty(false);
      setStorageError(null);
    },
    newDraft: () => {
      const song = addSection(newSong(), "Verse");
      setDraft(song);
      saveDraft(song);
      return song;
    },
    closeDraft: () => {
      setDraft(null);
      setDirty(false);
      setStorageError(null);
    },
    updateDraft: (song: Song) => {
      setDraft(song);
      saveDraft(song);
    },
  };
}
