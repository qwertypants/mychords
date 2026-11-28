import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function StickyStrumSpeed({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);

  useLayoutEffect(() => {
    const marker = sentinel.current;
    const sticky = container.current;
    if (!marker || !sticky || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      const top = Number.parseFloat(getComputedStyle(sticky).top) || 0;
      observer = new IntersectionObserver(([entry]) => {
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < top);
      }, { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 });
      observer.observe(marker);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, []);

  useLayoutEffect(() => {
    const element = control.current;
    if (!element || stuck) return;
    const measure = () => setExpandedHeight(element.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stuck]);

  return <>
    <div ref={sentinel} className="strum-speed-sentinel" aria-hidden="true" />
    <div ref={container} className={`song-speed-sticky${stuck ? " is-stuck" : ""}`}
      style={{ minHeight: expandedHeight || undefined }}>
      <div ref={control} className="song-speed-control">{children}</div>
    </div>
  </>;
}
