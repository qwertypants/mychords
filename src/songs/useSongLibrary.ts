import { useState, useEffect, useRef } from "react";
import type { Library, Song } from "./types";
import { readLibrary, writeLibrary, browserStorage } from "./storage";
import { newSong, addSection } from "./commands";
import { readSharedSong } from "./share";
export function useSongLibrary() {
  const [initial, setInitial] = useState(() => readLibrary(browserStorage));
  const [library, setLibrary] = useState<Library>(() =>
    initial.kind === "ok" ? initial.library : { version: 1, songs: [] },
  );
  const [draft, setDraft] = useState<Song | null>(null);
  const [dirty, setDirty] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const handledShare = useRef(false);
  useEffect(() => {
    if (initial.kind === "error" || handledShare.current) return;
    handledShare.current = true;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("song")) return;
    try {
      const song = readSharedSong(url.href);
      if (song) {
        // Consume the external URL once, after storage recovery permits opening it.
        // eslint-disable-next-line react/set-state-in-effect
        setDraft(song);
        setDirty(true);
        setSharedId(song.id);
      }
    } catch (error) {
      setShareError((error as Error).message);
    }
    url.searchParams.delete("song");
    window.history.replaceState(window.history.state, "", url);
  }, [initial.kind]);
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
  function saveDraft(): boolean {
    if (!draft || initial.kind === "error") return false;
    const next: Library = {
      version: 1,
      songs: library.songs.some((s) => s.id === draft.id)
        ? library.songs.map((s) => (s.id === draft.id ? draft : s))
        : [draft, ...library.songs],
    };
    const saved = writeLibrary(browserStorage, next);
    if (!saved.ok) {
      setStorageError(saved.message);
      return false;
    }
    setLibrary(next);
    setSharedId(null);
    setDirty(false);
    setStorageError(null);
    return true;
  }
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
  return {
    library,
    shareError,
    isShared: draft !== null && draft.id === sharedId,
    draft,
    dirty,
    storageError,
    initial,
    saveDraft,
    retry,
    reset,
    openSong: (song: Song) => {
      setDraft(structuredClone(song));
      setDirty(false);
      setStorageError(null);
    },
    newDraft: () => {
      setDraft(addSection(newSong("Untitled song"), "Verse"));
      setDirty(true);
      setStorageError(null);
    },
    closeDraft: () => {
      setDraft(null);
      setDirty(false);
      setStorageError(null);
    },
    updateDraft: (song: Song) => {
      setDraft(song);
      setDirty(true);
      setStorageError(null);
    },
  };
}
