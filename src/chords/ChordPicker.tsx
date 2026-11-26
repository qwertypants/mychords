import { useRef, useState, useMemo, useEffect, useLayoutEffect, useCallback } from "react";
import gsap from "gsap";
import { X, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  findVoicings,
  roots,
  catalog,
} from "./catalog";
import { groupChords, inCategory, primaryCategories, extraCategories, type Category } from "./browse";
import { RootSelector } from "./RootSelector";
import { NeckPositionSelect } from "./NeckPositionSelect";
import { ChordGroups } from "./ChordGroups";
import type { Voicing } from "./types";
import { useMotion } from "../motion";
import { readPickerPreferences, writePickerPreferences } from "./pickerPreferences";

type ChordAddition = { voicingId: string };

export function ChordPicker({
  onHear,
  onAdd,
  onClose,
  sectionName,
  playback,
  activeEntryId,
  strumInterval,
  strumSpeedControl,
}: {
  onHear: (v: Voicing, stringIndex?: number) => void;
  onAdd: (v: Voicing) => boolean;
  onClose: () => void;
  sectionName: string;
  playback?: React.ReactNode;
  activeEntryId: string | null;
  strumInterval?: number;
  strumSpeedControl?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(null);
  const setDialogRef = useCallback((node: HTMLDialogElement | null) => {
    dialog.current = node;
    setDialogElement(node);
  }, []);
  const search = useRef<HTMLInputElement>(null);
  const resultsScroll = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const scrollTravel = useRef(0);
  const opener = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const [initial] = useState(readPickerPreferences);
  const [root, setRoot] = useState(initial.root);
  const [category, setCategory] = useState<Category>(initial.category);
  const [more, setMore] = useState(initial.more);
  const [filtersExpanded, setFiltersExpanded] = useState(initial.filtersExpanded);
  const [searchExpanded, setSearchExpanded] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 600px), (max-height: 600px)").matches);
  const [scrollMenusHidden, setScrollMenusHidden] = useState(false);
  const menusHidden = compact && scrollMenusHidden;
  const shapesHideMenus = compact && expanded !== null;
  const visibleSearch = searchExpanded && !shapesHideMenus;
  const visibleFilters = filtersExpanded && !shapesHideMenus;
  const [text, setText] = useState(initial.text);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initial.selectedGroupId);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [region, setRegion] = useState(initial.region);
  const [limit, setLimit] = useState(24);
  const [added, setAdded] = useState<ChordAddition | null>(null);
  const hideMenus = () => {
    if (!compact || expanded) return;
    if (dialog.current?.querySelector(".picker-menu-stack")?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    setSuggestionsOpen(false);
    setScrollMenusHidden(true);
  };
  const handleResultsScroll = () => {
    const top = resultsScroll.current?.scrollTop ?? 0;
    const delta = top - lastScrollTop.current;
    lastScrollTop.current = top;
    if (!compact || expanded) return;
    if (top <= 2) {
      scrollTravel.current = 0;
      setScrollMenusHidden(false);
      return;
    }
    if (Math.sign(delta) !== Math.sign(scrollTravel.current)) scrollTravel.current = delta;
    else scrollTravel.current += delta;
    if (scrollTravel.current >= 20) {
      scrollTravel.current = 0;
      hideMenus();
    } else if (scrollTravel.current <= -12) {
      scrollTravel.current = 0;
      setScrollMenusHidden(false);
    }
  };
  useEffect(() => {
    writePickerPreferences({ root, category, region, text, selectedGroupId, more, filtersExpanded });
  }, [root, category, region, text, selectedGroupId, more, filtersExpanded]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px), (max-height: 600px)");
    const update = () => {
      setCompact(media.matches);
      setScrollMenusHidden(false);
      scrollTravel.current = 0;
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    const el = dialog.current,
      returnTo = opener.current;
    el?.showModal();
    if (window.matchMedia("(pointer: coarse)").matches)
      el?.querySelector<HTMLButtonElement>(".picker-header button")?.focus({ preventScroll: true });
    else search.current?.focus({ preventScroll: true });
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
    gsap.timeline({ defaults: { overwrite: "auto", ease: "power2.out" } })
      .fromTo(edge, { scaleY: 0, opacity: 0.9 }, { scaleY: 1, duration: 0.15 }, 0)
      .to(edge, { opacity: 0, duration: 0.07, clearProps: "transform,opacity" }, 0.15);
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
    const query = text.trim().toLowerCase();
    return groupChords(findVoicings({ text }))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(query)) - Number(a.label.toLowerCase().startsWith(query)) || a.label.localeCompare(b.label));
  }, [text]);
  useEffect(() => {
    if (!suggestionsOpen) return;
    const list = dialog.current?.querySelector<HTMLElement>("#chord-suggestions");
    const option = list?.children[activeSuggestion] as HTMLElement | undefined;
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [suggestionsOpen, activeSuggestion, suggestions]);
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
      ref={setDialogRef}
      className="picker-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (expanded) {
          const trigger = dialog.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"].shape-toggle');
          setExpanded(null);
          requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
          return;
        }
        onClose();
      }}
      aria-label={`Chord library for ${sectionName}`}
    >
      <span className="picker-motion-edge" aria-hidden="true" />
      <header className="picker-header" inert={expanded !== null}>
        <div>
          <span className="eyebrow">THE CHORD LIBRARY</span>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close chord library"
        >
          <X size={21} />
        </button>
      </header>
      <div className={`picker-menu-stack${menusHidden ? " is-hidden" : ""}`} inert={menusHidden || expanded !== null}>
      <div className="picker-menu-content">
      <div className="picker-search-toolbar">
        <button
          className="picker-filter-toggle"
          type="button"
          aria-expanded={visibleSearch}
          aria-controls="picker-search-controls"
          onClick={() => {
            if (shapesHideMenus) {
              setExpanded(null);
              setSearchExpanded(true);
            } else setSearchExpanded(value => !value);
            setSuggestionsOpen(false);
          }}
        >
          <Search size={16} aria-hidden="true" />
          Search &amp; notes
          <ChevronDown size={16} className={visibleSearch ? "is-expanded" : ""} aria-hidden="true" />
        </button>
        <div id="picker-search-controls" hidden={!visibleSearch}>
        <div className="search-combobox">
        <div className="search-field">
          <Search size={18} />
          <input
            ref={search}
            aria-label="Search chords"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="chord-suggestions"
            aria-activedescendant={suggestionsOpen && suggestions.length > 0 ? `chord-suggestion-${activeSuggestion}` : undefined}
            placeholder="Search a chord or quality…"
            value={text}
            onFocus={() => { setSuggestionsOpen(true); setActiveSuggestion(0); }}
            onBlur={() => window.setTimeout(() => {
              if (document.activeElement !== search.current) setSuggestionsOpen(false);
            }, 0)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                setSuggestionsOpen(false);
                const next = e.shiftKey ? ".picker-header button" : ".root-tabs button";
                dialog.current?.querySelector<HTMLButtonElement>(next)?.focus();
                return;
              }
              if (e.key === "Escape" && suggestionsOpen) {
                e.preventDefault();
                e.stopPropagation();
                setSuggestionsOpen(false);
                return;
              }
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
          {text && <button
            className="search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              filter(() => {
                setRoot(""); setCategory("All"); setText(""); setRegion("all");
              });
              setSuggestionsOpen(false);
              search.current?.focus();
            }}
          ><X size={16} aria-hidden="true" /></button>}
        </div>
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
        <RootSelector value={root} onChange={value => filter(() => setRoot(value))} />
        </div>
        <button
          className="picker-filter-toggle"
          type="button"
          aria-expanded={visibleFilters}
          aria-controls="picker-filter-controls"
          onClick={() => {
            if (shapesHideMenus) {
              setExpanded(null);
              setFiltersExpanded(true);
            } else setFiltersExpanded(value => !value);
          }}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          <ChevronDown size={16} className={visibleFilters ? "is-expanded" : ""} aria-hidden="true" />
        </button>
      </div>
      <div id="picker-filter-controls" className="picker-filters" hidden={!visibleFilters}>
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
        <div className="picker-option-groups">
          <NeckPositionSelect value={region} onChange={value => filter(() => setRegion(value))} />
          {strumSpeedControl && <div className="picker-strum-speed">{strumSpeedControl}</div>}
        </div>
      </div>
      </div>
      </div>
      <div className="picker-scroll" ref={resultsScroll} onScroll={handleResultsScroll} inert={expanded !== null} aria-hidden={expanded !== null}>
      {playback && <div className="picker-playback">{playback}</div>}
      <div className="picker-results">
        <div className="results-count" role="status">
          <span><span>{groups.length} chords</span><span className="summary-separator"> · </span><span>{results.length} fingerings</span></span>
          <span className="tuning-summary"><span>Standard tuning</span><span className="summary-separator"> · </span><span>E A D G B e</span></span>
        </div>
        {roots.map(r => {
          const visible = groups.filter(g => g.root === r);
          const shown = groups.slice(0, limit).filter(g => g.root === r);
          return shown.length > 0 && <section key={r} className="chord-root-section" aria-label={r + " chords"}>
            <h3>{r} chords <span>{visible.length}</span></h3>
            <ChordGroups groups={shown} expanded={expanded} dialog={dialogElement} onExpand={id => {
              setExpanded(id);
              if (id) {
                setSuggestionsOpen(false);
                setScrollMenusHidden(false);
                scrollTravel.current = 0;
              }
            }}
              activeEntryId={activeEntryId} strumInterval={strumInterval} added={added} onHear={onHear}
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
      </div>
    </dialog>
  );
}
