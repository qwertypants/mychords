import { useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
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
import { previewEntryId } from "../audio/guitar";
import { pulseIcon, useMotion } from "../motion";

type ChordAddition = { voicingId: string };

function VoicingCard({ voicing, playing, added, onHear, onAdd }: {
  voicing: Voicing;
  playing: boolean;
  added: ChordAddition | null;
  onHear: () => void;
  onAdd: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  useMotion(card, added, (element) => {
    const edges = element.querySelectorAll(".voicing-add-edge > span");
    const sweep = gsap.timeline({ defaults: { overwrite: "auto" } });
    edges.forEach((edge, index) => {
      const scale = index % 2 === 0 ? "scaleX" : "scaleY";
      sweep.fromTo(edge, { [scale]: 0, opacity: 0.9 }, {
        [scale]: 1, duration: 0.075, ease: "power2.out", immediateRender: false,
      }, index * 0.035);
    });
    sweep.to(edges, { opacity: 0, duration: 0.125, clearProps: "transform,opacity" });
    pulseIcon(element.querySelector(".add-voicing svg"));
  });
  const { id, label, frets } = voicing;
  return (
    <article ref={card} className={`voicing-card${playing ? " is-playing" : ""}`} data-voicing={id}>
      {added && (
        <span className="voicing-add-edge" aria-hidden="true">
          <span /><span /><span /><span />
        </span>
      )}
      <div className="voicing-heading">
        <h3>{label}</h3>
        <span>Fret {positionOf(frets)}</span>
      </div>
      <ChordDiagram voicing={voicing} playing={playing} />
      <div className="voicing-actions">
        <button onClick={onHear} aria-label={`Hear ${label}, ${frets.join(" ")}`}>
          <Volume2 size={16} />
          Hear
        </button>
        <button className="add-voicing" onClick={onAdd} aria-label={`Add ${label}, ${frets.join(" ")}`}>
          {added ? <Check size={16} /> : <Plus size={16} />}{" "}
          {added ? "Added" : "Add"}
        </button>
      </div>
    </article>
  );
}

export function ChordPicker({
  onHear,
  onAdd,
  onClose,
  sectionName,
  playback,
  activeEntryId,
}: {
  onHear: (v: Voicing) => void;
  onAdd: (v: Voicing) => boolean;
  onClose: () => void;
  sectionName: string;
  playback?: React.ReactNode;
  activeEntryId: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
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
  const [added, setAdded] = useState<ChordAddition | null>(null);
  useLayoutEffect(() => {
    const el = dialog.current,
      returnTo = opener.current;
    el?.showModal();
    search.current?.focus({ preventScroll: true });
    return () => {
      el?.close();
      queueMicrotask(() => {
        if (el?.isConnected && el.open) return;
        if (returnTo?.isConnected) returnTo.focus();
        else
          document
            .getElementById("main-content")
            ?.focus({ preventScroll: true });
      });
    };
  }, []);
  useMotion(dialog, true, (element) => {
    const edge = element.querySelector(".picker-motion-edge");
    const heading = element.querySelector("#picker-heading");
    gsap.timeline({ defaults: { overwrite: "auto", ease: "power2.out" } })
      .fromTo(edge, { scaleY: 0, opacity: 0.9 }, { scaleY: 1, duration: 0.15 }, 0)
      .to(edge, { opacity: 0, duration: 0.07, clearProps: "transform,opacity" }, 0.15)
      .fromTo(heading, { y: 10 }, { y: 0, duration: 0.22, clearProps: "transform" }, 0);
  });
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
      <span className="picker-motion-edge" aria-hidden="true" />
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
            ref={search}
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
            <VoicingCard
              key={v.id}
              voicing={v}
              playing={activeEntryId === previewEntryId("picker", v.id)}
              added={added?.voicingId === v.id ? added : null}
              onHear={() => onHear(v)}
              onAdd={() => {
                if (onAdd(v)) setAdded({ voicingId: v.id });
              }}
            />
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
