import { useRef, useState, useMemo, useEffect } from "react";
import { X, Volume2, Plus, Search, Check } from "lucide-react";
import {
  findVoicings,
  roots,
  suffixes,
  qualityLabel,
  catalog,
} from "./catalog";
import { positionOf } from "./pitch";
import { ChordDiagram } from "./ChordDiagram";
import type { Voicing } from "./types";
export function ChordPicker({
  onHear,
  onAdd,
  onClose,
  sectionName,
  playback,
}: {
  onHear: (v: Voicing) => void;
  onAdd: (v: Voicing) => void;
  onClose: () => void;
  sectionName: string;
  playback?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [root, setRoot] = useState("C");
  const [suffix, setSuffix] = useState("major");
  const [text, setText] = useState("");
  const [region, setRegion] = useState("all");
  const [limit, setLimit] = useState(24);
  const [added, setAdded] = useState<string | null>(null);
  useEffect(() => {
    const el = dialog.current,
      returnTo = opener.current;
    el?.showModal();
    return () => {
      el?.close();
      queueMicrotask(() => {
        if (returnTo?.isConnected) returnTo.focus();
        else
          document
            .getElementById("main-content")
            ?.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(null), 1300);
    return () => clearTimeout(timer);
  }, [added]);
  const results = useMemo(
    () =>
      findVoicings({
        root,
        suffix,
        text,
        minFret: region === "all" ? 0 : Number(region),
        maxFret:
          region === "0" ? 4 : region === "5" ? 9 : region === "10" ? 14 : 22,
      }),
    [root, suffix, text, region],
  );
  const filter = (fn: () => void) => {
    fn();
    setLimit(24);
  };
  return (
    <dialog
      ref={dialog}
      className="picker-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="picker-heading"
    >
      <header className="picker-header">
        <div>
          <span className="eyebrow">THE CHORD LIBRARY</span>
          <h2 id="picker-heading">Find your next chord.</h2>
          <p>
            Add to <strong>{sectionName}</strong>
          </p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close chord library"
        >
          <X size={21} />
        </button>
      </header>
      <div className="picker-filters">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search chords</span>
          <input
            autoFocus
            placeholder="Search a chord or quality…"
            value={text}
            onChange={(e) =>
              filter(() => {
                setText(e.target.value);
                if (e.target.value) {
                  setRoot("");
                  setSuffix("");
                }
              })
            }
          />
        </label>
        <div className="root-tabs" aria-label="Chord roots">
          <button
            aria-pressed={!root}
            onClick={() => filter(() => setRoot(""))}
          >
            All
          </button>
          {roots.map((r) => (
            <button
              key={r}
              aria-pressed={root === r}
              onClick={() => filter(() => setRoot(r))}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <label>
            Chord type
            <select
              value={suffix}
              onChange={(e) => filter(() => setSuffix(e.target.value))}
            >
              <option value="">All types</option>
              {suffixes.map((s) => (
                <option key={s} value={s}>
                  {qualityLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Neck position
            <select
              value={region}
              onChange={(e) => filter(() => setRegion(e.target.value))}
            >
              <option value="all">Whole neck</option>
              <option value="0">Frets 0–4</option>
              <option value="5">Frets 5–9</option>
              <option value="10">Frets 10–14</option>
              <option value="15">Frets 15–22</option>
            </select>
          </label>
        </div>
      </div>
      {playback && <div className="picker-playback">{playback}</div>}
      <div className="picker-results">
        <div className="results-count" role="status">
          {results.length} voicings <span>Standard tuning · E A D G B e</span>
        </div>
        <div className="voicing-grid">
          {results.slice(0, limit).map((v) => (
            <article className="voicing-card" key={v.id} data-voicing={v.id}>
              <div className="voicing-heading">
                <h3>{v.label}</h3>
                <span>Fret {positionOf(v.frets)}</span>
              </div>
              <ChordDiagram voicing={v} />
              <div className="voicing-actions">
                <button
                  onClick={() => onHear(v)}
                  aria-label={`Hear ${v.label}, ${v.frets.join(" ")}`}
                >
                  <Volume2 size={16} />
                  Hear
                </button>
                <button
                  className="add-voicing"
                  onClick={() => {
                    onAdd(v);
                    setAdded(v.id);
                  }}
                  aria-label={`Add ${v.label}, ${v.frets.join(" ")}`}
                >
                  {added === v.id ? <Check size={16} /> : <Plus size={16} />}{" "}
                  {added === v.id ? "Added" : "Add"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!results.length && (
          <p className="empty-results">
            No matching voicings. Try a different chord type or neck position.
          </p>
        )}
        {results.length > limit && (
          <button
            className="button show-more"
            onClick={() => setLimit((n) => n + 24)}
          >
            Show more voicings
          </button>
        )}
        <p className="catalog-note">
          {catalog.length.toLocaleString()} fingerings across the neck.
          Available voicings vary by chord. Finger numbers 1–4; × muted, ○ open.
        </p>
      </div>
    </dialog>
  );
}
