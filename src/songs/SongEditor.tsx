import { useRef, useState } from "react";
import { Plus, Save, ArrowLeft } from "lucide-react";
import type { Song } from "./types";
import type { Voicing } from "../chords/types";
import type { PlaybackState, PreviewItem } from "../audio/guitar";
import { songPreview } from "./preview";
import { SectionEditor } from "./SectionEditor";
import {
  addSection,
  moveChord,
  removeChord,
  renameSong,
  renameSection,
} from "./commands";
import { pulseIcon, useMotion, useViewEntrance } from "../motion";
export function SongEditor({
  song,
  onChange,
  onSave,
  onBack,
  onAdd,
  onHear,
  onPlay,
  onRemoveSection,
  playback,
}: {
  song: Song;
  onChange: (s: Song) => void;
  onSave: () => boolean;
  onBack: () => void;
  onAdd: (sectionId: string) => void;
  onHear: (v: Voicing, entryId: string, stringIndex?: number) => void;
  onPlay: (items: PreviewItem[]) => void;
  onRemoveSection: (id: string) => void;
  playback: PlaybackState;
}) {
  const heading = useRef<HTMLDivElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const [saveCount, setSaveCount] = useState(0);
  useViewEntrance(heading);
  useMotion(saveButton, saveCount, (button) => pulseIcon(button.querySelector("svg")));
  const count = song.sections.reduce((n, s) => n + s.chords.length, 0);
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
          <p className="eyebrow" data-motion-heading>A WORK IN PROGRESS</p>
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
          <p className="song-meta">
            {song.sections.length}{" "}
            {song.sections.length === 1 ? "section" : "sections"} <span>·</span>{" "}
            {count} chords <span>·</span> Standard tuning
          </p>
        </div>
        <button
          ref={saveButton}
          className="button primary save-button"
          onClick={() => {
            const saved = onSave();
            setSaveCount((count) => saved ? count + 1 : 0);
          }}
        >
          <Save size={16} />
          Save
        </button>
      </div>
      {playback.status === "error" && <p role="alert">{playback.message}</p>}
      <div className="sections">
        {song.sections.map((section, i) => (
          <SectionEditor
            key={section.id}
            section={section}
            index={i}
            activeEntryId={playback.activeEntryId}
            onRename={(name) => onChange(renameSection(song, section.id, name))}
            onRemove={() => onRemoveSection(section.id)}
            onAdd={() => onAdd(section.id)}
            onHear={onHear}
            onPlay={() => onPlay(songPreview(song, section.id))}
            onMove={(id, index) =>
              onChange(moveChord(song, section.id, id, index))
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
        A place for your chord ideas. Drag the handles to rearrange, or use the
        arrows.
      </p>
    </main>
  );
}
