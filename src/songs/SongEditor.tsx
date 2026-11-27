import { useRef, useState } from "react";
import { Plus, ArrowLeft, Share2, Trash2 } from "lucide-react";
import type { Song } from "./types";
import type { Voicing } from "../chords/types";
import type { PlaybackState, PreviewItem } from "../audio/guitar";
import { songPreview } from "./preview";
import { SectionEditor } from "./SectionEditor";
import {
  addSection,
  moveChord,
  replaceChordVoicing,
  removeChord,
  renameSong,
  renameSection,
} from "./commands";
import { useViewEntrance } from "../motion";
import { createShareUrl } from "./share";
import { appRoot } from "./routes";
import { ConfirmDialog } from "../ConfirmDialog";
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
  playback,
  strumSpeedControl,
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
  playback: PlaybackState;
  strumSpeedControl?: React.ReactNode;
}) {
  const [playingSectionId, setPlayingSectionId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  async function share() {
    setShareMessage("");
    let link: string;
    try {
      link = createShareUrl(song, new URL(appRoot(), window.location.href).href);
    } catch (error) {
      setShareMessage((error as Error).message);
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage("Link copied.");
    } catch {
      setFallbackLink(link);
    }
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
          <button className="icon-button" onClick={share} aria-label="Share">
            <Share2 size={20} aria-hidden="true" />
          </button>
          <button className="icon-button song-delete-button" onClick={onDelete} aria-label="Delete song">
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="share-status" role="status">{shareMessage}</p>
      {fallbackLink && (
        <ConfirmDialog title="Copy song link" onCancel={() => setFallbackLink(null)} actions={null}>
          <p>Copy this link to share a snapshot of your song.</p>
          <textarea className="share-link" aria-label="Song share link" readOnly value={fallbackLink}
            onFocus={(event) => event.currentTarget.select()} />
        </ConfirmDialog>
      )}
      {playback.status === "error" && <p role="alert">{playback.message}</p>}
      {strumSpeedControl}
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
            onAdd={() => { setPlayingSectionId(null); onAdd(section.id); }}
            onHear={(...args) => { setPlayingSectionId(null); onHear(...args); }}
            playing={playingSectionId === section.id && (playback.status === "loading" || playback.status === "playing")}
            onStop={() => { setPlayingSectionId(null); onStop(); }}
            onPlay={() => { setPlayingSectionId(section.id); onPlay(songPreview(song, section.id)); }}
            onMove={(id, index) =>
              onChange(moveChord(song, section.id, id, index))
            }
            onChangeVoicing={(id, voicingId) =>
              onChange(replaceChordVoicing(song, section.id, id, voicingId))
            }
            onRemoveChord={(id) => onChange(removeChord(song, section.id, id))}
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
      <p className="editor-note">
        A place for your chord ideas. Drag the handles to rearrange chords; use
        the arrows to try other shapes.
      </p>
    </main>
  );
}
