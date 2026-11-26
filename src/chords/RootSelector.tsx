import { useLayoutEffect, useRef, useState } from "react";
import { roots } from "./catalog";

export function RootSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = () => {
    const el = rail.current;
    if (el) setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  const reveal = (button: HTMLButtonElement) => {
    const el = rail.current;
    if (!el) return;
    const left = button.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    if (left < el.scrollLeft + 24 || left + button.offsetWidth > el.scrollLeft + el.clientWidth - 24) {
      el.scrollTo?.({ left: left - (el.clientWidth - button.offsetWidth) / 2 });
    }
  };
  useLayoutEffect(() => {
    const el = rail.current;
    const selected = el?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (selected) reveal(selected);
    updateEdges();
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div ref={rail} className="root-tabs" role="group" aria-label="Chord roots"
      data-fade-left={edges.left} data-fade-right={edges.right} onScroll={updateEdges}>
      {["", ...roots].map(root => (
        <button key={root} type="button" aria-pressed={value === root}
          onFocus={event => reveal(event.currentTarget)} onClick={() => onChange(root)}>
          {root || "All"}
        </button>
      ))}
    </div>
  );
}
