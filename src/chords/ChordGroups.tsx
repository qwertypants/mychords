import { Fragment, useEffect, useRef, useState } from "react";
import type { ChordGroup } from "./browse";
import type { Voicing } from "./types";
import { VoicingCard } from "./VoicingCard";
import { previewEntryId } from "../audio/guitar";

export function ChordGroups({ groups, expanded, onExpand, activeEntryId, strumInterval, added, onHear, onAdd }: {
  groups: ChordGroup[];
  expanded: string | null;
  onExpand: (id: string | null) => void;
  activeEntryId: string | null;
  strumInterval?: number;
  added: { voicingId: string } | null;
  onHear: (v: Voicing, stringIndex?: number) => void;
  onAdd: (v: Voicing) => void;
}) {
  const [columns, setColumns] = useState(() => typeof matchMedia === "function" && matchMedia("(max-width: 600px)").matches ? 2 : 3);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 600px)");
    if (!media) return;
    const update = () => setColumns(media.matches ? 2 : 3);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const selected = groups.find(g => g.id === expanded);
  const selectedIndex = groups.findIndex(g => g.id === expanded);
  const rowEnd = selectedIndex < 0 ? -1 : Math.min(groups.length - 1, Math.floor(selectedIndex / columns) * columns + columns - 1);
  const card = (v: Voicing, preview = false) => <VoicingCard key={v.id} voicing={v}
    playing={preview === previewPlaying && activeEntryId === previewEntryId("picker", v.id)}
    strumInterval={strumInterval}
    added={added?.voicingId === v.id ? added : null} onHear={() => { setPreviewPlaying(preview); onHear(v); }} onNote={(stringIndex) => { setPreviewPlaying(preview); onHear(v, stringIndex); }} onAdd={() => onAdd(v)} />;
  const toggle = (group: ChordGroup) => {
    const trigger = triggers.current.get(group.id);
    const before = trigger?.getBoundingClientRect().top;
    onExpand(expanded === group.id ? null : group.id);
    const keepTriggerInPlace = () => {
      const scroller = trigger?.closest(".picker-scroll");
      if (scroller && before !== undefined && trigger) scroller.scrollTop += trigger.getBoundingClientRect().top - before;
    };
    requestAnimationFrame(keepTriggerInPlace);
  };
  return <div className="voicing-grid grouped-chords">
    {groups.map((group, index) => <Fragment key={group.id}>
      <div className="chord-group">
        {card(group.voicings[0], true)}
        {group.voicings.length > 1 && <button className="shape-toggle" ref={node => { if (node) triggers.current.set(group.id, node); else triggers.current.delete(group.id); }}
          aria-label={`Shapes for ${group.label}`} aria-expanded={expanded === group.id}
          aria-controls={expanded === group.id ? `shapes-${group.id}` : undefined} onClick={() => toggle(group)}>
          {group.voicings.length - 1} other {group.voicings.length === 2 ? "shape" : "shapes"} {expanded === group.id ? "−" : "+"}
        </button>}
      </div>
      {index === rowEnd && selected && <section className="shape-panel" id={`shapes-${selected.id}`} aria-label={`Fingerings for ${selected.label}`}>
        <header><h4>{selected.label} · {selected.voicings.length - 1} other {selected.voicings.length === 2 ? "shape" : "shapes"}</h4>
          <button onClick={() => { onExpand(null); triggers.current.get(selected.id)?.focus({ preventScroll: true }); }}>Close shapes</button></header>
        <div className="voicing-grid">{selected.voicings.slice(1).map(v => card(v))}</div>
      </section>}
    </Fragment>)}
  </div>;
}
