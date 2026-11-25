import { useRef } from "react";
import gsap from "gsap";
import type { Voicing } from "./types";
import { positionOf } from "./pitch";
import { STRUM_STRING_INTERVAL } from "../audio/guitar";
import { useMotion } from "../motion";

export function ChordDiagram({ voicing, playing }: { voicing: Voicing; playing: boolean }) {
  const diagram = useRef<SVGSVGElement>(null);
  useMotion(diagram, playing && voicing.id, (svg) => {
    const markers = Array.from(svg.querySelectorAll("[data-strum-string]")).sort(
      (a, b) => Number(a.getAttribute("data-strum-string")) - Number(b.getAttribute("data-strum-string")),
    );
    gsap.fromTo(
      markers,
      { "--strum-scale": 1.32, "--strum-glow": 1 },
      {
        "--strum-scale": 1,
        "--strum-glow": 0,
        duration: 0.29,
        stagger: STRUM_STRING_INTERVAL,
        ease: "power1.out",
        overwrite: "auto",
        immediateRender: false,
        clearProps: "--strum-scale,--strum-glow",
      },
    );
  });
  const start = Math.max(1, positionOf(voicing.frets));
  const rows = Math.max(4, Math.max(...voicing.frets) - start + 1);
  const description = `${voicing.label}. Low E to high E: ${voicing.frets.map((f) => (f < 0 ? "muted" : f === 0 ? "open" : `fret ${f}`)).join(", ")}.`;
  return (
    <svg
      ref={diagram}
      className="chord-diagram"
      viewBox={`0 0 150 ${68 + rows * 22}`}
      role="img"
      aria-label={description}
    >
      <text x="6" y="58" className="fret-number">
        {start}
      </text>
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1="29"
          x2="129"
          y1={42 + i * 22}
          y2={42 + i * 22}
          strokeWidth={i === 0 && start === 1 ? 3 : 1}
        />
      ))}
      {voicing.frets.map((f, i) => (
        <g key={i}>
          <line
            x1={29 + i * 20}
            x2={29 + i * 20}
            y1="42"
            y2={42 + rows * 22}
            strokeWidth={1 + (5 - i) * 0.13}
          />
          {f <= 0 ? (
            <g data-strum-string={f === 0 ? i : undefined}>
              {f === 0 && (
                <circle className="strum-ring" cx={29 + i * 20} cy="23" r="9" aria-hidden="true" />
              )}
              <text x={29 + i * 20} y="28" textAnchor="middle" className="open-marker">
                {f < 0 ? "×" : "○"}
              </text>
            </g>
          ) : null}
          <text
            x={29 + i * 20}
            y={60 + rows * 22}
            textAnchor="middle"
            className="string-letter"
          >
            {["E", "A", "D", "G", "B", "e"][i]}
          </text>
        </g>
      ))}
      {voicing.barres.map((f) => {
        const strings = voicing.frets
          .map((n, i) => (n === f ? i : -1))
          .filter((i) => i >= 0);
        if (strings.length < 2) return null;
        return (
          <line
            key={f}
            className="barre"
            x1={29 + Math.min(...strings) * 20}
            x2={29 + Math.max(...strings) * 20}
            y1={53 + (f - start) * 22}
            y2={53 + (f - start) * 22}
          />
        );
      })}
      {voicing.frets.map((f, i) =>
        f > 0 ? (
          <g key={i} data-strum-string={i}>
            <circle
              className="strum-ring"
              cx={29 + i * 20}
              cy={53 + (f - start) * 22}
              r="10.5"
              aria-hidden="true"
            />
            <circle cx={29 + i * 20} cy={53 + (f - start) * 22} r="7.5" />
            <text
              className="finger"
              x={29 + i * 20}
              y={56 + (f - start) * 22}
              textAnchor="middle"
            >
              {voicing.fingers[i]}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}
