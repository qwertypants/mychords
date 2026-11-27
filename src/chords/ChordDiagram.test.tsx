import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ChordDiagram } from "./ChordDiagram";
import { getVoicing } from "./catalog";

test("open C colors the selected notes and shows exact alternatives on muted strings", () => {
  const onNote = vi.fn();
  const voicing = getVoicing("C:major:-1,3,2,0,1,0")!;
  const { container } = render(<ChordDiagram voicing={voicing} playing={false} onNote={onNote} />);
  expect(container.querySelector(".degree-label")).toBeNull();
  expect(Array.from(container.querySelectorAll("[data-strum-string]"), node => [node.getAttribute("data-strum-string"), node.getAttribute("data-tone")])).toEqual([
    ["3", "fifth"], ["5", "third"], ["1", "root"], ["2", "third"], ["4", "root"],
  ]);
  expect(Array.from(container.querySelectorAll(".tone-guide"), node => [node.getAttribute("data-string"), node.getAttribute("data-fret"), node.textContent])).toEqual([
    ["0", "0", "3"], ["0", "3", "5"], ["5", "3", "5"],
  ]);
  expect(screen.getAllByRole("button")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "Play C D string fret 2, E, major third" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Play C G string open, G, perfect fifth" }), { key: "Enter" });
  expect(onNote.mock.calls).toEqual([[2], [3]]);
  expect(container.querySelector(".tone-guides")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelector(".tone-guide [tabindex]")).toBeNull();
});

test("high barre shapes retain actual note roles and have guides within their fret window", () => {
  const voicing = getVoicing("C:major:8,10,10,9,8,8")!;
  const { container } = render(<ChordDiagram voicing={voicing} playing={false} />);
  expect(container.querySelector(".degree-label")).toBeNull();
  const guideFrets = Array.from(container.querySelectorAll(".tone-guide"), node => Number(node.getAttribute("data-fret")));
  expect(guideFrets.length).toBeGreaterThan(0);
  expect(guideFrets.every(fret => fret === 0 || (fret >= 8 && fret <= 11))).toBe(true);
  expect(container.querySelector(".barre")).toBeInTheDocument();
});
