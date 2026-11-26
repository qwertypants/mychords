import { useRef } from "react";
import gsap from "gsap";
import { Play, Plus, Check } from "lucide-react";
import { ChordDiagram } from "./ChordDiagram";
import type { Voicing } from "./types";
import { pulseIcon, useMotion } from "../motion";
type ChordAddition = { voicingId: string };
export function VoicingCard({ voicing, playing, strumInterval, added, onHear, onNote, onAdd }: {
  voicing: Voicing;
  playing: boolean;
  strumInterval?: number;
  added: ChordAddition | null;
  onHear: () => void;
  onNote: (stringIndex: number) => void;
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
      </div>
      <ChordDiagram voicing={voicing} playing={playing} strumInterval={strumInterval} onNote={onNote} />
      <div className="voicing-actions">
        <button onClick={onHear} aria-label={`Hear ${label}, ${frets.join(" ")}`}>
          <Play size={18} fill="currentColor" aria-hidden="true" />
        </button>
        <button className="add-voicing" onClick={onAdd} aria-label={`Add ${label}, ${frets.join(" ")}`}>
          {added ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}
