import {
  ArrowUpRight,
  Plus,
  Music2,
  FolderOpen,
  Volume2,
  ArrowRight,
} from "lucide-react";
import type { Song } from "./types";
import type { Voicing } from "../chords/types";
import { getVoicing, catalog } from "../chords/catalog";
import { ChordDiagram } from "../chords/ChordDiagram";
import { PlaybackControls } from "../audio/PlaybackControls";
import type { PlaybackState } from "../audio/guitar";
const examples = [
  "C:major:-1,3,2,0,1,0",
  "A:minor:-1,0,2,2,1,0",
  "G:major:3,2,0,0,0,3",
].flatMap((id) => {
  const v = getVoicing(id);
  return v ? [v] : [];
});
export function SongLibrary({
  songs,
  onNew,
  onOpen,
  onExplore,
  onHear,
  playback,
  onStop,
}: {
  songs: Song[];
  onNew: () => void;
  onOpen: (s: Song) => void;
  onExplore: () => void;
  onHear: (v: Voicing) => void;
  playback: PlaybackState;
  onStop: () => void;
}) {
  return (
    <main className="library-main" id="main-content">
      <section className="welcome">
        <div className="welcome-copy">
          <p className="eyebrow">YOUR GUITAR. YOUR IDEAS.</p>
          <h1>
            Good songs start
            <br />
            with a <em>chord.</em>
          </h1>
          <p className="welcome-description">
            Find a new shape. Hear how it feels.
            <br />
            Keep the chords that belong together.
          </p>
          <div className="welcome-actions">
            <button className="button primary" onClick={onNew}>
              <Plus size={17} />
              New song
            </button>
            <button
              className="text-button"
              onClick={(e) => {
                e.currentTarget.focus();
                onExplore();
              }}
            >
              Explore chords
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
        <div
          className="hero-chords"
          aria-label="Try a few acoustic guitar chords"
        >
          <div className="hero-caption">
            <span>THREE CHORDS. ENDLESS POSSIBILITIES.</span>
            <span>01 — 03</span>
          </div>
          <div className="hero-chord-row">
            {examples.map((v) => (
              <button
                className="hero-chord"
                key={v.id}
                onClick={() => onHear(v)}
                aria-label={`Hear ${v.label}`}
              >
                <span className="hero-chord-label">{v.label}</span>
                <ChordDiagram voicing={v} />
                <span className="hero-hear">
                  <Volume2 size={14} />
                  Hear
                </span>
              </button>
            ))}
          </div>
          <div className="hero-footnote">
            <span className="sound-dot" />
            Sampled acoustic guitar
            <Music2 size={17} />
          </div>
        </div>
      </section>
      <section className="saved-songs">
        <header className="library-section-header">
          <div>
            <p className="eyebrow">THE NOTEBOOK</p>
            <h2>
              Your songs <span>{songs.length.toString().padStart(2, "0")}</span>
            </h2>
          </div>
          <button className="button secondary" onClick={onNew}>
            <Plus size={16} />
            New song
          </button>
        </header>
        {songs.length ? (
          <div className="saved-song-grid">
            {songs.map((s, i) => (
              <button
                className="saved-song"
                key={s.id}
                onClick={() => onOpen(s)}
                aria-label={`Open ${s.name || "Untitled song"}`}
              >
                <span className="saved-song-number">
                  {String(i + 1).padStart(2, "0")}
                  <Music2 size={18} />
                </span>
                <h3>{s.name || "Untitled song"}</h3>
                <p>
                  {s.sections.length} sections ·{" "}
                  {s.sections.reduce((n, sec) => n + sec.chords.length, 0)}{" "}
                  chords
                </p>
                <span className="saved-song-bottom">
                  {new Date(s.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  <ArrowUpRight size={18} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <div className="notebook-mark">
              <FolderOpen size={29} strokeWidth={1} />
            </div>
            <h3>Every idea deserves a page.</h3>
            <p>
              Your songs will live here, ready for the next time
              <br className="desktop-break" /> you pick up your guitar.
            </p>
            <button className="text-button" onClick={onNew}>
              Start your first song
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>
      <button
        className="catalog-banner"
        onClick={(e) => {
          e.currentTarget.focus();
          onExplore();
        }}
      >
        <span className="catalog-icon">
          <Music2 size={23} />
        </span>
        <span>
          <strong>The whole neck, at your fingertips.</strong>
          <span>
            {catalog.length.toLocaleString()} voicings · 12 roots · Open shapes
            to fret 22
          </span>
        </span>
        <ArrowUpRight size={22} />
      </button>
      <PlaybackControls state={playback} onStop={onStop} />
    </main>
  );
}
