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
  expect(screen.getAllByRole("group", { name: /Low E to high E/ })[0]).toHaveAccessibleName(/Low E to high E/);
  fireEvent.click(screen.getByRole("radio", { name: "Frets 15–22" }));
  expect(screen.getAllByRole("group", { name: /Low E to high E/ })[0]).toHaveAccessibleName(
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
  fireEvent.click(screen.getByRole("radio", { name: "Frets 15–22" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Search chords" }), { target: { value: "D♭" } });
  expect(screen.getByRole("radio", { name: "Whole neck" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Shapes for C#/C" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Search chords" }), { target: { value: "no-such-chord" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByRole("combobox", { name: "Search chords" })).toHaveValue("");
});


test("filter toggle hides controls without losing the selected filters", () => {
  render(<ChordPicker onHear={() => {}} onAdd={() => true} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  const toggle = screen.getByRole("button", { name: "Filters" });
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("button", { name: "Major" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Shapes for C" })).toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute("aria-pressed", "true");
});

test("clicking a labeled diagram note requests that string alone", () => {
  const hear = vi.fn();
  render(<ChordPicker onHear={hear} onAdd={() => true} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Play C/A D string fret 2" })[0]);
  expect(hear).toHaveBeenCalledWith(expect.objectContaining({ label: "C/A" }), 2);
  expect(screen.queryByRole("button", { name: /Play C\/A E string muted/ })).not.toBeInTheDocument();
});

test("type-ahead offers chords and selecting one shows its exact shapes", () => {
  render(<ChordPicker onHear={() => {}} onAdd={() => true} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  const search = screen.getByRole("combobox", { name: "Search chords" });
  fireEvent.change(search, { target: { value: "C/A" } });
  expect(search).toHaveAttribute("aria-expanded", "true");
  const option = screen.getByText("C/A", { selector: ".chord-suggestions span" });
  fireEvent.click(option);
  expect(search).toHaveValue("C/A");
  expect(search).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Shapes for C/A" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Shapes for C/Ab" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "C/Ab" } });
  expect(screen.getByRole("button", { name: "Shapes for C/Ab" })).toBeInTheDocument();
});
