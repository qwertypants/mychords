import { useEffect, useRef, useState } from "react";
import { Plus, ArrowLeft, Check, Share2, Trash2, ListMusic, Square } from "lucide-react";
import type { Song } from "./types";
import type { Voicing } from "../chords/types";
import type { PlaybackState, PreviewItem } from "../audio/guitar";
import { songPreview } from "./preview";
import { SectionEditor } from "./SectionEditor";
import { StickyStrumSpeed } from "./StickyStrumSpeed";
import {
  addSection,
  moveChord,
  replaceChordVoicing,
  renameSong,
  renameSection,
} from "./commands";
import { useViewEntrance } from "../motion";
import { createShareUrl } from "./share";
import { appRoot } from "./routes";

const SHARE_FEEDBACK_DURATION = 1500;

function copyLinkWithLegacyClipboard(link: string): boolean {
  const field = document.createElement("textarea");
  field.value = link;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

export function SongEditor({
  song,
  onChange,
  onBack,
  onDelete,
  onAdd,
  onHear,
  onPlay,
  onStop,
  onRemoveSection,
  onRemoveChord,
  playback,
  strumSpeedControl,
  onOpenShared,
}: {
  song: Song;
  onChange: (s: Song) => void;
  onBack: () => void;
  onDelete: () => void;
  onAdd: (sectionId: string) => void;
  onHear: (v: Voicing, entryId: string, stringIndex?: number) => void;
  onPlay: (items: PreviewItem[]) => void;
  onStop: () => void;
  onRemoveSection: (id: string) => void;
  onRemoveChord: (sectionId: string, entryId: string) => void;
  playback: PlaybackState;
  strumSpeedControl?: React.ReactNode;
  onOpenShared?: (link: string) => string | null;
}) {
  const [sharedLink, setSharedLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [playbackTarget, setPlaybackTarget] = useState<
    { kind: "song" } | { kind: "section"; id: string } | null
  >(null);
  const songItems = songPreview(song);
  const playing = playback.status === "loading" || playback.status === "playing";
  const playingSong = playbackTarget?.kind === "song" && playing;
  function stop() {
    setPlaybackTarget(null);
    onStop();
  }
  const [shareMessage, setShareMessage] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const shareFeedbackTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (shareFeedbackTimer.current !== null) window.clearTimeout(shareFeedbackTimer.current);
  }, []);

  async function share() {
    setShareMessage("");
    setShareCopied(false);
    if (shareFeedbackTimer.current !== null) {
      window.clearTimeout(shareFeedbackTimer.current);
      shareFeedbackTimer.current = null;
    }
    let link: string;
    try {
      link = createShareUrl(song, new URL(appRoot(), window.location.href).href);
    } catch (error) {
      setShareMessage((error as Error).message);
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch {
      try {
        copied = copyLinkWithLegacyClipboard(link);
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      setShareMessage("Could not copy link. Allow clipboard access and try again.");
      return;
    }
    if (shareFeedbackTimer.current !== null) {
      window.clearTimeout(shareFeedbackTimer.current);
    }
    setShareCopied(true);
    shareFeedbackTimer.current = window.setTimeout(() => {
      setShareCopied(false);
      shareFeedbackTimer.current = null;
    }, SHARE_FEEDBACK_DURATION);
  }
  const heading = useRef<HTMLDivElement>(null);
  useViewEntrance(heading);
  return (
    <main className="editor-main" id="main-content" tabIndex={-1}>
      <div className="editor-breadcrumb">
        <button
          onClick={(e) => {
            e.currentTarget.focus();
            onBack();
          }}
        >
          <ArrowLeft size={15} />
          All songs
        </button>
        <span>/</span>
        <span>Song notebook</span>
      </div>
      <div ref={heading} className="editor-heading">
        <div>
          <h1>
            <label>
              <span className="sr-only">Song name</span>
              <input
                className="song-title"
                aria-label="Song name"
                maxLength={200}
                value={song.name}
                onChange={(e) => onChange(renameSong(song, e.target.value))}
                placeholder="Untitled song"
              />
            </label>
          </h1>
        </div>
        <div className="song-actions">
          <button
            className="icon-button share-button"
            onClick={share}
            aria-label="Share"
            aria-describedby={shareCopied ? "share-copied-tooltip" : undefined}
          >
            {shareCopied ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
            {shareCopied && (
              <span className="share-tooltip" id="share-copied-tooltip" role="tooltip">
                Copied
              </span>
            )}
          </button>
          <button className="icon-button song-delete-button" onClick={onDelete} aria-label="Delete song">
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="share-status" role="status">{shareMessage}</p>
      {playback.status === "error" && <p role="alert">{playback.message}</p>}
      {strumSpeedControl && <StickyStrumSpeed>
        {strumSpeedControl}
        <button className="song-play-all" disabled={!playingSong && !songItems.length}
          aria-label={playingSong ? "Stop song" : "Play all chords"}
          title={playingSong ? "Stop song" : "Play all chords"}
          onClick={playingSong ? stop : () => {
            setPlaybackTarget({ kind: "song" });
            onPlay(songItems);
          }}>
          {playingSong ? <Square size={20} aria-hidden="true" /> : <ListMusic size={20} aria-hidden="true" />}
          <span>{playingSong ? "Stop" : "Play all"}</span>
        </button>
      </StickyStrumSpeed>}
      <div className="sections">
        {song.sections.map((section, i) => (
          <SectionEditor
            key={section.id}
            section={section}
            index={i}
            activeEntryId={playback.activeEntryId}
            strumInterval={playback.strumInterval}
            onRename={(name) => onChange(renameSection(song, section.id, name))}
            onRemove={() => onRemoveSection(section.id)}
            onAdd={() => { setPlaybackTarget(null); onAdd(section.id); }}
            onHear={(...args) => { setPlaybackTarget(null); onHear(...args); }}
            playing={playbackTarget?.kind === "section" && playbackTarget.id === section.id && playing}
            onStop={stop}
            onPlay={() => { setPlaybackTarget({ kind: "section", id: section.id }); onPlay(songPreview(song, section.id)); }}
            onMove={(id, index) =>
              onChange(moveChord(song, section.id, id, index))
            }
            onChangeVoicing={(id, voicingId) =>
              onChange(replaceChordVoicing(song, section.id, id, voicingId))
            }
            onRemoveChord={(id) => onRemoveChord(section.id, id)}
          />
        ))}
      </div>
      <button
        className="add-section-button"
        onClick={() =>
          onChange(addSection(song, `Section ${song.sections.length + 1}`))
        }
      >
        <Plus size={18} />
        Add section
      </button>
      {onOpenShared && (
        <form className="editor-shared-link" onSubmit={(event) => {
          event.preventDefault();
          setLinkError(onOpenShared(sharedLink));
        }}>
          <label htmlFor="editor-shared-link">Open a shared song link</label>
          <div className="editor-shared-link-row">
            <input id="editor-shared-link" type="text" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={sharedLink} onChange={(event) => { setSharedLink(event.target.value); setLinkError(null); }} placeholder="Paste song link" />
            <button className="button secondary" type="submit">Open song</button>
          </div>
          {linkError && <p role="alert">{linkError}</p>}
        </form>
      )}
      <p className="editor-note">
        A place for your chord ideas. Drag the handles to rearrange chords; use
        the arrows to try other shapes.
      </p>
    </main>
  );
}
