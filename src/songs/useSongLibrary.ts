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
  const [sharedLink, setSharedLink] = useState<{ url: string; name: string } | null>(null);
  const handledShare = useRef(false);
  const pendingReplacement = useRef<string | null>(null);
  const saveDraft = useCallback((song = draft): boolean => {
    if (!song || initial.kind === "error") return false;
    const kept = library.songs.filter((s) => s.id !== pendingReplacement.current);
    const next: Library = {
      version: 1,
      songs: kept.some((s) => s.id === song.id)
        ? kept.map((s) => (s.id === song.id ? song : s))
        : [song, ...kept],
    };
    const saved = writeLibrary(browserStorage, next);
    if (!saved.ok) {
      setDirty(true);
      setStorageError(saved.message);
      return false;
    }
    setLibrary(next);
    pendingReplacement.current = null;
    setDirty(false);
    setStorageError(null);
    return true;
  }, [draft, initial.kind, library]);
  useEffect(() => {
    if (initial.kind === "error" || handledShare.current) return;
    handledShare.current = true;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("song")) return;
    try {
      const song = readSharedSong(url.href);
      if (song) {
        if (!window.matchMedia("(display-mode: standalone)").matches && !(navigator as Navigator & { standalone?: boolean }).standalone) {
          // The URL is an external input that is resolved after storage recovery.
          // eslint-disable-next-line react/set-state-in-effect
          setSharedLink({ url: url.href, name: song.name });
          return;
        }
        setDraft(song);
        saveDraft(song);
        url.searchParams.delete("song");
        window.history.replaceState(window.history.state, "", url);
        onImport(song);
      }
    } catch (error) {
      setShareError((error as Error).message);
    }
  }, [initial.kind, saveDraft, onImport]);
  function importSharedLink(link: string, replaceId: string | null = null): string | null {
    let song: Song | null;
    try {
      song = readSharedSong(link.trim());
      if (!song) throw new Error();
    } catch {
      return "This shared song link is invalid, unsupported, or too large. Your saved songs have not changed.";
    }
    setSharedLink(null);
    setShareError(null);
    pendingReplacement.current = replaceId;
    setDraft(song);
    saveDraft(song);
    onImport(song);
    return null;
  }
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
    sharedLink,
    importSharedLink,
    draft,
    dirty,
    storageError,
    initial,
    saveDraft,
    retry,
    reset,
    deleteSong,
    openSong: (song: Song) => {
      pendingReplacement.current = null;
      setDraft(structuredClone(song));
      setDirty(false);
      setStorageError(null);
    },
    newDraft: () => {
      pendingReplacement.current = null;
      const song = addSection(newSong(), "Verse");
      setDraft(song);
      saveDraft(song);
      return song;
    },
    closeDraft: () => {
      pendingReplacement.current = null;
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
