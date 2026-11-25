import { useRef, useState, useMemo, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { X, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  findVoicings,
  roots,
  catalog,
} from "./catalog";
import { groupChords, inCategory, primaryCategories, extraCategories, type Category } from "./browse";
import { ChordGroups } from "./ChordGroups";
import type { Voicing } from "./types";
import { useMotion } from "../motion";

type ChordAddition = { voicingId: string };

export function ChordPicker({
  onHear,
  onAdd,
  onClose,
  sectionName,
  playback,
  activeEntryId,
}: {
  onHear: (v: Voicing, stringIndex?: number) => void;
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
  const [category, setCategory] = useState<Category>("All");
  const [more, setMore] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
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
  const available = useMemo(
    () =>
      findVoicings({
        root,
        text,
        minFret: region === "all" ? 0 : Number(region),
        maxFret:
          region === "0" ? 4 : region === "5" ? 9 : region === "10" ? 14 : 22,
      }),
    [root, text, region],
  );
  const suggestions = useMemo(() => {
    if (!text.trim()) return [];
    const query = text.trim().toLowerCase();
    return groupChords(findVoicings({ text }))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(query)) - Number(a.label.toLowerCase().startsWith(query)) || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [text]);
  const results = useMemo(() => available.filter(v =>
    inCategory(v.suffix, category) && (!selectedGroupId || `${v.root}:${v.suffix}` === selectedGroupId)
  ), [available, category, selectedGroupId]);
  const groups = useMemo(() => groupChords(results).sort((a, b) => roots.indexOf(a.root) - roots.indexOf(b.root)), [results]);
  const filter = (fn: () => void) => {
    if (selectedGroupId) setText("");
    setSelectedGroupId(null);
    fn();
    setLimit(24);
    setExpanded(null);
  };
  const selectSuggestion = (id: string, label: string) => {
    filter(() => {
      setText(label);
      setRoot("");
      setCategory("All");
      setRegion("all");
    });
    setSelectedGroupId(id);
    setSuggestionsOpen(false);
    search.current?.focus();
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
        <button
          className="picker-filter-toggle"
          type="button"
          aria-expanded={filtersExpanded}
          aria-controls="picker-filter-controls"
          onClick={() => setFiltersExpanded(value => !value)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          <ChevronDown size={16} className={filtersExpanded ? "is-expanded" : ""} aria-hidden="true" />
        </button>
        <div id="picker-filter-controls" hidden={!filtersExpanded}>
        <div className="search-combobox">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search chords</span>
          <input
            ref={search}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="chord-suggestions"
            aria-activedescendant={suggestionsOpen && suggestions.length > 0 ? `chord-suggestion-${activeSuggestion}` : undefined}
            placeholder="Search a chord or quality…"
            value={text}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 0)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                setSuggestionsOpen(false);
                const next = e.shiftKey ? ".picker-filter-toggle" : ".root-tabs button";
                dialog.current?.querySelector<HTMLButtonElement>(next)?.focus();
                return;
              }
              if (e.key === "Escape") setSuggestionsOpen(false);
              if (!suggestionsOpen || !suggestions.length) return;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion(index => (index + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const choice = suggestions[activeSuggestion];
                if (choice) selectSuggestion(choice.id, choice.label);
              }
            }}
            onChange={(e) =>
              filter(() => {
                setText(e.target.value);
                setSuggestionsOpen(true);
                setActiveSuggestion(0);
                if (e.target.value) {
                  setRoot("");
                  setCategory("All");
                  setRegion("all");
                }
              })
            }
          />
        </label>
        {suggestionsOpen && suggestions.length > 0 && (
          <ul id="chord-suggestions" className="chord-suggestions" role="listbox" aria-label="Chord suggestions">
            {suggestions.map((group, index) => (
              <li key={group.id} id={`chord-suggestion-${index}`} role="option"
                aria-selected={index === activeSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(group.id, group.label)}>
                <span>{group.label}</span><small>{group.voicings.length} shapes</small>
              </li>
            ))}
          </ul>
        )}
        </div>
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
        <div className="category-tabs" role="group" aria-label="Chord categories">
          {primaryCategories.map(c => <button key={c} aria-pressed={category === c}
            disabled={c !== "All" && !available.some(v => inCategory(v.suffix, c))}
            onClick={() => filter(() => setCategory(c))}>{c}</button>)}
          <button aria-expanded={more || extraCategories.some(c => c === category)} aria-controls="extra-categories" onClick={() => { if (extraCategories.some(c => c === category)) filter(() => setCategory("All")); setMore(!more); }}>More</button>
        </div>
        {(more || extraCategories.some(c => c === category)) && <div id="extra-categories" className="category-tabs extra-categories" role="group" aria-label="More chord categories">
          {extraCategories.map(c => <button key={c} aria-pressed={category === c}
            disabled={!available.some(v => inCategory(v.suffix, c))}
            onClick={() => filter(() => setCategory(c))}>{c}</button>)}
        </div>}
        <div className="filter-row">
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
      </div>
      {playback && <div className="picker-playback">{playback}</div>}
      <div className="picker-results">
        <div className="results-count" role="status">
          {groups.length} chords · {results.length} fingerings <span>Standard tuning · E A D G B e</span>
        </div>
        {roots.map(r => {
          const visible = groups.filter(g => g.root === r);
          const shown = groups.slice(0, limit).filter(g => g.root === r);
          return shown.length > 0 && <section key={r} className="chord-root-section" aria-label={r + " chords"}>
            <h3>{r} chords <span>{visible.length}</span></h3>
            <ChordGroups groups={shown} expanded={expanded} onExpand={setExpanded}
              activeEntryId={activeEntryId} added={added} onHear={onHear}
              onAdd={v => { if (onAdd(v)) setAdded({ voicingId: v.id }); }} />
          </section>;
        })}
        {!results.length && (
          <p className="empty-results">
            No matching chords.
            <button className="button" onClick={() => filter(() => {
              setRoot(""); setCategory("All"); setText(""); setRegion("all");
            })}>Reset filters</button>
          </p>
        )}
        {groups.length > limit && (
          <button
            className="button show-more"
            onClick={() => setLimit((n) => n + 24)}
          >
            Show more chords
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
