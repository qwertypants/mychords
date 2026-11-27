import { useCallback, useEffect, useRef, useState } from "react";
import {
  Guitar,
  Plus,
  BookOpen,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
import { useSongLibrary } from "./songs/useSongLibrary";
import { SongLibrary } from "./songs/SongLibrary";
import { SongsPage } from "./songs/SongsPage";
import { SongEditor } from "./songs/SongEditor";
import { addChord, addSection, newSong, removeSection } from "./songs/commands";
import { ChordToneLegend } from "./chords/ChordToneLegend";
import { ChordPicker } from "./chords/ChordPicker";
import type { Voicing } from "./chords/types";
import type { Song } from "./songs/types";
import { usePlayback } from "./audio/usePlayback";
import { previewEntryId } from "./audio/guitar";
import { PlaybackControls } from "./audio/PlaybackControls";
import { StrumSpeedSelect } from "./audio/StrumSpeedSelect";
import { ConfirmDialog } from "./ConfirmDialog";
import { PwaControls } from "./pwa/PwaControls";
import { appRoot, readSongRoute, songPath, songsPath } from "./songs/routes";
import type { SongRoute } from "./songs/routes";
import "./styles.css";
export default function App() {
  const [route, setRoute] = useState<SongRoute>(readSongRoute);
  const importSong = useCallback((song: Song) => {
    window.history.replaceState(window.history.state, "", `${songPath(song.id)}${window.location.search}`);
    setRoute({ kind: "song", id: song.id });
  }, []);
  const store = useSongLibrary(route.kind === "song" ? route.id : null, importSong);
  const audio = usePlayback();
  const strumSpeedControl = (
    <StrumSpeedSelect speed={audio.strumSpeed} onChange={audio.changeStrumSpeed} />
  );
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: () => void; cancel?: () => void } | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const transition = (action: () => void) => {
    audio.stop();
    if (store.dirty) setPending({ action });
    else action();
  };
  const navigate = (next: SongRoute) => {
    const path = next.kind === "song" ? songPath(next.id) : next.kind === "songs" ? songsPath(next.page) : appRoot();
    if (`${window.location.pathname}${window.location.search}` !== path)
      window.history.pushState(window.history.state, "", path);
    setRoute(next);
  };
  const goHome = () => transition(() => navigate({ kind: "library" }));
  const goSongs = () => transition(() => navigate({ kind: "songs", page: 1 }));
  const createSong = () => transition(() => {
    const song = store.newDraft();
    navigate({ kind: "song", id: song.id });
  });
  useEffect(() => {
    const onPopState = () => {
      const target = readSongRoute();
      audio.stop();
      if (store.dirty) {
        const currentPath = route.kind === "song" ? songPath(route.id) : route.kind === "songs" ? songsPath(route.page) : appRoot();
        setPending({
          action: () => setRoute(target),
          cancel: () => window.history.pushState(window.history.state, "", currentPath),
        });
      } else setRoute(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [audio, route, store.dirty]);
  useEffect(() => {
    if (store.initial.kind === "error") return;
    if (route.kind === "song") {
      if (store.draft?.id === route.id) return;
      const song = store.library.songs.find((item) => item.id === route.id);
      if (song) store.openSong(song);
      else store.closeDraft();
    } else if (store.draft) store.closeDraft();
  }, [route, store]);
  const change = (song: Song) => {
    audio.stop();
    store.updateDraft(song);
  };
  const hear = (voicing: Voicing, entryId: string, stringIndex?: number) =>
    audio.play([{ entryId, voicing, stringIndex }]);
  function add(v: Voicing) {
    const song = store.draft;
    if (!pickerFor) return false;
    if (pickerFor === "new" || !song) {
      const next = addSection(song ?? newSong(), "Verse");
      const sectionId = next.sections[0].id;
      change(addChord(next, sectionId, v.id));
      if (!song) navigate({ kind: "song", id: next.id });
      setPickerFor(sectionId);
      return true;
    }
    const next = addChord(song, pickerFor, v.id);
    if (next === song) return false;
    change(next);
    return true;
  }
  function downloadRaw(raw: string) {
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mychords-saved-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const blocked = store.initial.kind === "error";
  const screen = blocked ? "recovery" : route.kind === "song" ? route.id : route.kind === "songs" ? `songs-${route.page}` : route.kind;
  const previousScreen = useRef(screen);
  useEffect(() => {
    if (previousScreen.current !== screen) {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
      previousScreen.current = screen;
    }
  }, [screen]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand-heading">
          <button
            className="brand"
            aria-label="MyChords home"
            onClick={goHome}
          >
            <span className="brand-icon">
              <Guitar size={21} strokeWidth={1.6} />
            </span>
            <span>
              mychords<span className="brand-period">.</span>
            </span>
          </button>
          <ChordToneLegend />
        </div>
        <nav aria-label="Main navigation">
          <button
            className={route.kind === "songs" ? "nav-link active" : "nav-link"}
            onClick={goSongs}
          >
            <BookOpen size={16} />
            My songs
          </button>
          <button
            className="nav-link explore-nav"
            disabled={blocked}
            onClick={(e) => {
              e.currentTarget.focus();
              setPickerFor(store.draft?.sections[0]?.id ?? "new");
            }}
          >
            Chord library
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <button
          className="header-new icon-button"
          onClick={createSong}
          disabled={blocked}
          aria-label="New song"
        >
          <Plus size={21} />
        </button>
      </header>
      {blocked ? (
        <main className="recovery" id="main-content" tabIndex={-1}>
          <p className="eyebrow">SAVED DATA NEEDS ATTENTION</p>
          <h1>Let’s keep your ideas safe.</h1>
          <p>{store.initial.kind === "error" && store.initial.message}</p>
          <div className="recovery-actions">
            {store.initial.kind === "error" && store.initial.raw !== null && (
              <button
                className="button primary"
                onClick={() => {
                  if (
                    store.initial.kind === "error" &&
                    store.initial.raw !== null
                  )
                    downloadRaw(store.initial.raw);
                }}
              >
                Download raw data
              </button>
            )}
            <button className="button secondary" onClick={store.retry}>
              Retry
            </button>
            <button
              className="text-button"
              onClick={() => setResetConfirm(true)}
            >
              Start fresh
            </button>
          </div>
        </main>
      ) : route.kind === "song" && store.draft?.id === route.id ? (
        <SongEditor
          key={store.draft.id}
          song={store.draft}
          onChange={change}
          onBack={goSongs}
          onDelete={() => setDeleteTarget(store.draft)}
          onAdd={setPickerFor}
          onHear={hear}
          onPlay={audio.play}
          onStop={audio.stop}
          playback={audio.state}
          strumSpeedControl={strumSpeedControl}
          onRemoveSection={(id) => {
            const section = store.draft?.sections.find((s) => s.id === id);
            if (section?.chords.length) setRemoveId(id);
            else if (store.draft) change(removeSection(store.draft, id));
          }}
        />
      ) : route.kind === "library" ? (
        <SongLibrary
          songs={store.library.songs}
          onNew={createSong}
          onOpen={(s) => transition(() => navigate({ kind: "song", id: s.id }))}
          onExplore={() => setPickerFor("new")}
          onHear={(v) => hear(v, previewEntryId("library", v.id))}
          playback={audio.state}
          strumSpeedControl={strumSpeedControl}
          onStop={audio.stop}
          onViewAll={goSongs}
        />
      ) : route.kind === "songs" ? (
        <SongsPage
          songs={store.library.songs}
          page={route.page}
          onPage={(page) => navigate({ kind: "songs", page })}
          onNew={createSong}
          onOpen={(s) => transition(() => navigate({ kind: "song", id: s.id }))}
          onDelete={setDeleteTarget}
        />
      ) : (
        <main className="recovery" id="main-content" tabIndex={-1}>
          <h1>Song not found</h1>
          <p>This song isn’t saved in this browser.</p>
          <button className="button primary" onClick={goSongs}>All songs</button>
        </main>
      )}
      {store.shareError && <div className="storage-error" role="alert">{store.shareError}</div>}
      {store.storageError && (
        <div className="storage-error" role="alert">
          {store.storageError}
          <button className="button secondary" onClick={() => store.saveDraft()}>Retry saving</button>
        </div>
      )}
      <PwaControls dirty={store.dirty} />
      <footer className="app-footer">
        <span>
          <LockKeyhole size={13} />
          Saved in your browser. Just for you.
        </span>
        <span>Made for the moments between chords.</span>
        <a href={`${appRoot()}credits.html`}>Credits</a>
      </footer>
      {pickerFor && !blocked && (
        <ChordPicker
          sectionName={
            store.draft?.sections.find((s) => s.id === pickerFor)?.name ??
            "a new song"
          }
          onHear={(v, stringIndex) => audio.play([{ entryId: stringIndex === undefined ? previewEntryId("picker", v.id) : `picker-note:${v.id}:${stringIndex}`, voicing: v, stringIndex }])}
          activeEntryId={audio.state.activeEntryId}
          strumInterval={audio.state.strumInterval}
          strumSpeedControl={strumSpeedControl}
          onAdd={add}
          onClose={() => {
            audio.stop();
            setPickerFor(null);
          }}
          playback={audio.state.status !== "error" ? null : (
            <PlaybackControls state={audio.state} onStop={audio.stop} />
          )}
        />
      )}
      {pending && (
        <ConfirmDialog
          title="Keep your changes?"
          onCancel={() => { pending.cancel?.(); setPending(null); }}
          actions={
            <>
              <button
                className="button primary"
                onClick={() => {
                  if (store.saveDraft()) {
                    pending.action();
                    setPending(null);
                  }
                }}
              >
                Save changes
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  pending.action();
                  setPending(null);
                }}
              >
                Discard changes
              </button>
            </>
          }
        >
          <p>This song has changes that haven’t been saved.</p>
        </ConfirmDialog>
      )}
      {removeId && (
        <ConfirmDialog
          title="Remove this section?"
          onCancel={() => setRemoveId(null)}
          actions={
            <button
              className="button danger"
              onClick={() => {
                if (store.draft) change(removeSection(store.draft, removeId));
                setRemoveId(null);
              }}
            >
              Remove section
            </button>
          }
        >
          <p>
            Its chords will be removed from this song.
          </p>
        </ConfirmDialog>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this song?"
          onCancel={() => setDeleteTarget(null)}
          actions={
            <button
              className="button danger"
              onClick={() => {
                audio.stop();
                if (store.deleteSong(deleteTarget.id)) {
                  navigate({ kind: "songs", page: route.kind === "songs" ? route.page : 1 });
                }
                setDeleteTarget(null);
              }}
            >
              Delete song
            </button>
          }
        >
          <p>“{deleteTarget.name || "Untitled song"}” will be permanently removed from this browser.</p>
        </ConfirmDialog>
      )}
      {resetConfirm && (
        <ConfirmDialog
          title="Replace the stored library?"
          onCancel={() => setResetConfirm(false)}
          actions={
            <button
              className="button danger"
              onClick={() => {
                store.reset();
                setResetConfirm(false);
              }}
            >
              Replace with empty library
            </button>
          }
        >
          <p>
            Download your raw data first if you want to keep a copy. This
            replaces the saved library in this browser.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
