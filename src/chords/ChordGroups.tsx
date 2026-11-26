import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import type { ChordGroup } from "./browse";
import type { Voicing } from "./types";
import { VoicingCard } from "./VoicingCard";
import { previewEntryId } from "../audio/guitar";

type CardPosition = { left: number; top: number };
type FanLayout = {
  origin: CardPosition;
  width: number;
  height: number;
  positions: CardPosition[];
};

function layoutFan(dialog: HTMLDialogElement, trigger: HTMLButtonElement, count: number): FanLayout | null {
  const group = trigger.closest<HTMLElement>(".chord-group");
  if (!group) return null;
  const bounds = dialog.getBoundingClientRect();
  const source = group.getBoundingClientRect();
  const cardHeight = group.querySelector(".voicing-card")?.getBoundingClientRect().height ?? source.height;
  const width = Math.min(source.width, bounds.width - 24);
  const overlap = 12;
  const columns = Math.max(1, Math.min(3, Math.floor((bounds.width - 24 + overlap) / (width - overlap))));
  const stepX = width - overlap;
  const stepY = cardHeight + 8;
  const rows = Math.ceil((count + 1) / columns);
  const span = columns * width - (columns - 1) * overlap;
  const startX = Math.max(12, (bounds.width - span) / 2);
  const origin = { left: source.left - bounds.left, top: source.top - bounds.top };
  const startY = Math.max(68, Math.min(origin.top - stepY, bounds.height - (rows - 1) * stepY - cardHeight - 12));
  const centerX = origin.left + width / 2;
  const centerY = origin.top + cardHeight / 2;
  const slots: CardPosition[] = [];
  for (let row = 0; row < rows + 2; row++) {
    for (let column = 0; column < columns; column++) {
      const left = startX + column * stepX;
      const top = startY + row * stepY;
      const overlapX = Math.max(0, Math.min(left + width, origin.left + width) - Math.max(left, origin.left));
      const overlapY = Math.max(0, Math.min(top + cardHeight, origin.top + source.height) - Math.max(top, origin.top));
      if (overlapX > 0 && overlapY > 0) continue;
      slots.push({ left, top });
    }
  }
  slots.sort((a, b) => {
    const distance = (point: CardPosition) => (point.left + width / 2 - centerX) ** 2 + (point.top + cardHeight / 2 - centerY) ** 2;
    return distance(a) - distance(b) || a.top - b.top;
  });
  const positions = slots.slice(0, count);
  const height = Math.max(bounds.height, origin.top + source.height + 12, ...positions.map(position => position.top + cardHeight + 12));
  return { origin, width, height, positions };
}

export function ChordGroups({ groups, expanded, onExpand, dialog, activeEntryId, strumInterval, added, onHear, onAdd }: {
  groups: ChordGroup[];
  expanded: string | null;
  onExpand: (id: string | null) => void;
  dialog: HTMLDialogElement | null;
  activeEntryId: string | null;
  strumInterval?: number;
  added: { voicingId: string } | null;
  onHear: (v: Voicing, stringIndex?: number) => void;
  onAdd: (v: Voicing) => void;
}) {
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [layout, setLayout] = useState<FanLayout | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const fan = useRef<HTMLElement>(null);
  const selected = groups.find(group => group.id === expanded);
  const selectedId = selected?.id;
  const card = (v: Voicing, preview = false) => <VoicingCard key={v.id} voicing={v}
    playing={preview === previewPlaying && activeEntryId === previewEntryId("picker", v.id)}
    strumInterval={strumInterval}
    added={added?.voicingId === v.id ? added : null} onHear={() => { setPreviewPlaying(preview); onHear(v); }} onNote={(stringIndex) => { setPreviewPlaying(preview); onHear(v, stringIndex); }} onAdd={() => onAdd(v)} />;

  useLayoutEffect(() => {
    if (!selectedId || !dialog) return;
    const trigger = triggers.current.get(selectedId);
    if (!trigger) return;
    const measure = () => {
      const source = trigger.getBoundingClientRect();
      const viewport = dialog.getBoundingClientRect();
      if (typeof trigger.scrollIntoView === "function" && (source.bottom < viewport.top + 60 || source.top > viewport.bottom - 60)) {
        trigger.scrollIntoView({ block: "center" });
      }
      setLayout(layoutFan(dialog, trigger, Number(trigger.getAttribute("data-shape-count"))));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(dialog);
    observer.observe(trigger.closest(".chord-group")!);
    return () => observer.disconnect();
  }, [dialog, selectedId]);

  useLayoutEffect(() => {
    if (!selectedId || !layout || !fan.current) return;
    const root = fan.current;
    root.querySelector<HTMLButtonElement>(".shape-fan-close")?.focus({ preventScroll: true });
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cards = root.querySelectorAll<HTMLElement>(".shape-fan-card");
    const animations = Array.from(cards, (element, index) => {
      const target = element.getBoundingClientRect();
      const source = root.querySelector(".shape-fan-origin")?.getBoundingClientRect();
      if (!source) return null;
      return gsap.fromTo(element,
        { x: source.left + source.width / 2 - target.left - target.width / 2,
          y: source.top + source.height / 2 - target.top - target.height / 2,
          rotation: (index % 2 ? 1 : -1) * Math.min(12, index * 3), scale: 0.75, opacity: 0 },
        { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.38,
          delay: index * 0.035, ease: "power3.out", clearProps: "transform,opacity" });
    });
    return () => animations.forEach(animation => animation?.kill());
  }, [layout, selectedId]);

  const close = () => {
    if (!selected) return;
    const id = selected.id;
    const finish = () => {
      onExpand(null);
      requestAnimationFrame(() => triggers.current.get(id)?.focus({ preventScroll: true }));
    };
    const source = fan.current?.querySelector(".shape-fan-origin")?.getBoundingClientRect();
    const cards = fan.current?.querySelectorAll<HTMLElement>(".shape-fan-card");
    if (!source || !cards?.length || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return finish();
    gsap.to(cards, {
      x: (_, element: HTMLElement) => { const box = element.getBoundingClientRect(); return source.left + source.width / 2 - box.left - box.width / 2; },
      y: (_, element: HTMLElement) => { const box = element.getBoundingClientRect(); return source.top + source.height / 2 - box.top - box.height / 2; },
      scale: 0.75, opacity: 0, duration: 0.24, stagger: 0.018, ease: "power2.in", overwrite: "auto", onComplete: finish,
    });
  };

  return <div className="voicing-grid grouped-chords">
    {groups.map(group => <div className="chord-group" key={group.id}>
      {card(group.voicings[0], true)}
      {group.voicings.length > 1 && <button className="shape-toggle" ref={node => { if (node) triggers.current.set(group.id, node); else triggers.current.delete(group.id); }}
        data-shape-count={group.voicings.length - 1}
        aria-label={`Shapes for ${group.label}`} aria-expanded={expanded === group.id}
        aria-controls={expanded === group.id ? `shapes-${group.id}` : undefined} onClick={() => onExpand(group.id)}>
        {group.voicings.length - 1} other {group.voicings.length === 2 ? "shape" : "shapes"} {expanded === group.id ? "−" : "+"}
      </button>}
    </div>)}
    {selected && dialog && layout && createPortal(<div className="shape-fan-backdrop" onClick={close}>
      <section className="shape-fan-canvas" ref={fan} id={`shapes-${selected.id}`}
        aria-label={`Fingerings for ${selected.label}`} style={{ height: layout.height }}>
        <button className="shape-fan-close" onClick={event => { event.stopPropagation(); close(); }}>Close shapes</button>
        <h4 className="sr-only">{selected.label} · {selected.voicings.length - 1} other {selected.voicings.length === 2 ? "shape" : "shapes"}</h4>
        <div className="shape-fan-origin chord-group" style={{ left: layout.origin.left, top: layout.origin.top, width: layout.width }}
          onClick={event => event.stopPropagation()}>
          {card(selected.voicings[0], true)}
          <button className="shape-toggle" aria-label={`Shapes for ${selected.label}`} aria-expanded="true"
            aria-controls={`shapes-${selected.id}`} onClick={close}>
            {selected.voicings.length - 1} other {selected.voicings.length === 2 ? "shape" : "shapes"} −
          </button>
        </div>
        {selected.voicings.slice(1).map((voicing, index) => {
          const position = layout.positions[index];
          return position && <div className="shape-fan-card" key={voicing.id}
            style={{ left: position.left, top: position.top, width: layout.width }} onClick={event => event.stopPropagation()}>
            {card(voicing)}
          </div>;
        })}
      </section>
    </div>, dialog)}
  </div>;
}
