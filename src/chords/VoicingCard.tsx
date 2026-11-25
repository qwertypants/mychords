import { useRef } from "react";
import gsap from "gsap";
import { Volume2, Plus, Check } from "lucide-react";
import { positionOf } from "./pitch";
import { ChordDiagram } from "./ChordDiagram";
import type { Voicing } from "./types";
import { pulseIcon, useMotion } from "../motion";
type ChordAddition = { voicingId: string };
export function VoicingCard({ voicing, playing, added, onHear, onAdd }: {
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
