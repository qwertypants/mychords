import type { RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type ContextSafe = ReturnType<typeof useGSAP>["contextSafe"];

export function useMotion<T extends Element>(
  scope: RefObject<T | null>,
  trigger: boolean | number | object | string | null,
  start: (element: T, contextSafe: ContextSafe) => void | (() => void),
) {
  useGSAP(
    (context, contextSafe) => {
      const element = scope.current;
      if (!trigger || !element || !contextSafe) return;
      const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      if (!preference || preference.matches) return;

      const stop = () => context.revert();
      const cleanup = start(element, contextSafe);
      preference.addEventListener("change", stop);
      return () => {
        preference.removeEventListener("change", stop);
        cleanup?.();
      };
    },
    { scope, dependencies: [trigger], revertOnUpdate: true },
  );
}

export function useViewEntrance(scope: RefObject<HTMLElement | null>) {
  useMotion(scope, true, (root, contextSafe) => {
    if (!window.IntersectionObserver) return;

    let observing = true;
    const enter = contextSafe((group: Element) => {
      const headings = group.querySelectorAll("[data-motion-heading]");
      const edges = Array.from(group.querySelectorAll(".motion-card-edge"))
        .filter((edge) => {
          const bounds = edge.getBoundingClientRect();
          return bounds.bottom >= 0 && bounds.top < window.innerHeight + 6;
        })
        .slice(0, 4);
      if (headings.length) {
        gsap.fromTo(headings, { y: 12 }, {
          y: 0,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform",
        });
      }
      if (edges.length) {
        gsap.fromTo(edges, { scaleX: 0.4, opacity: 1 }, {
          scaleX: 1,
          opacity: 0,
          duration: 0.165,
          stagger: 0.025,
          ease: "power1.inOut",
          overwrite: "auto",
          clearProps: "transform,opacity",
        });
      }
    });
    const observer = new IntersectionObserver((entries) => {
      if (!observing) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        enter(entry.target);
      }
    });
    const groups = root.querySelectorAll("[data-motion-entrance]");
    if (groups.length) groups.forEach((group) => observer.observe(group));
    else observer.observe(root);
    return () => {
      observing = false;
      observer.disconnect();
    };
  });
}

export function pulseIcon(icon: SVGElement | null) {
  if (!icon) return;
  gsap.timeline({ defaults: { overwrite: "auto" } })
    .fromTo(icon, { scale: 0.76 }, { scale: 1.38, duration: 0.115, ease: "power2.out" })
    .to(icon, { scale: 1, duration: 0.18, ease: "power2.out", clearProps: "transform" });
}
