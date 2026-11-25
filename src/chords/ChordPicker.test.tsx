import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ChordPicker } from "./ChordPicker";
import { catalog } from "./catalog";
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
test("Hear and Add are independent and diagrams describe exact strings", () => {
  const hear = vi.fn(),
    add = vi.fn(() => true);
  render(
    <ChordPicker
      onHear={hear}
      onAdd={add}
      onClose={() => {}}
      sectionName="Verse"
      activeEntryId={null}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  fireEvent.click(screen.getAllByRole("button", { name: /^Hear / })[0]);
  expect(hear).toHaveBeenCalledOnce();
  expect(add).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: /^Add C,/ })[0]);
  expect(add).toHaveBeenCalledOnce();
  expect(screen.getAllByRole("img")[0]).toHaveAccessibleName(/Low E to high E/);
  fireEvent.change(screen.getByLabelText("Neck position"), {
    target: { value: "15" },
  });
  expect(screen.getAllByRole("img")[0]).toHaveAccessibleName(
    /fret 1[5-9]|fret 2[0-2]/,
  );
  expect(catalog.length).toBeGreaterThan(1000);
});

test("categories, full search, inline comparison and reset keep shapes reachable", () => {
  const hear = vi.fn(), add = vi.fn(() => true);
  render(<ChordPicker onHear={hear} onAdd={add} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  const trigger = screen.getByRole("button", { name: "Shapes for C" });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const high = catalog.find(v => v.id === "C:major:8,10,10,9,8,8")!;
  fireEvent.click(screen.getByRole("button", { name: "Hear C, 8 10 10 9 8 8" }));
  expect(hear).toHaveBeenLastCalledWith(high);
  fireEvent.click(screen.getByRole("button", { name: "Add C, 8 10 10 9 8 8" }));
  expect(add).toHaveBeenLastCalledWith(high);
  fireEvent.click(screen.getByRole("button", { name: "Close shapes" }));
  expect(trigger).toHaveFocus();
  expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.change(screen.getByLabelText("Neck position"), { target: { value: "15" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Search chords" }), { target: { value: "D♭" } });
  expect(screen.getByLabelText("Neck position")).toHaveValue("all");
  expect(screen.getByRole("button", { name: "Shapes for C#/C" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Search chords" }), { target: { value: "no-such-chord" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByRole("textbox", { name: "Search chords" })).toHaveValue("");
});
