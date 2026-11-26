import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { ChordPicker } from "./ChordPicker";
import { catalog } from "./catalog";
beforeEach(() => localStorage.clear());
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

test("categories, full search, focused comparison and reset keep shapes reachable", async () => {
  const hear = vi.fn(), add = vi.fn(() => true);
  render(<ChordPicker onHear={hear} onAdd={add} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  const trigger = screen.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const high = catalog.find(v => v.id === "C:major:8,10,10,9,8,8")!;
  fireEvent.click(screen.getByRole("button", { name: "Hear C, 8 10 10 9 8 8" }));
  expect(hear).toHaveBeenLastCalledWith(high);
  fireEvent.click(screen.getByRole("button", { name: "Add C, 8 10 10 9 8 8" }));
  expect(add).toHaveBeenLastCalledWith(high);
  fireEvent.click(screen.getByRole("button", { name: "Close shapes" }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Frets 15–22" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Search chords" }), { target: { value: "D♭" } });
  expect(screen.getByRole("radio", { name: "Whole neck" })).toBeChecked();
  expect(screen.getByRole("button", { name: /^Shapes for C#\/C, \d+ other shapes?$/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("combobox", { name: "Search chords" })).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Search chords" }), { target: { value: "no-such-chord" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByRole("combobox", { name: "Search chords" })).toHaveValue("");
});

test("fan includes the selected fingering and all alternatives", () => {
  render(<ChordPicker onHear={() => {}} onAdd={() => true} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  const trigger = screen.getByRole("button", { name: /^Shapes for C\/A, \d+ other shapes?$/ });
  const group = trigger.closest(".chord-group")!;
  const preview = group.querySelector(".voicing-card")!.getAttribute("data-voicing");
  fireEvent.click(trigger);
  const panel = document.querySelector(".shape-fan-canvas")!;
  expect(panel.querySelector(`[data-voicing="${preview}"]`)).not.toBeNull();
  const alternatives = panel.querySelectorAll(".voicing-card");
  expect(alternatives.length).toBeGreaterThan(1);
  expect(trigger).toHaveTextContent(`${alternatives.length - 1}`);
  expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(panel.querySelector("h4")).toHaveTextContent(`${alternatives.length - 1} other`);
});


test("filter toggle hides controls without losing the selected filters", () => {
  render(<ChordPicker onHear={() => {}} onAdd={() => true} onClose={() => {}} sectionName="Verse" activeEntryId={null} />);
  const toggle = screen.getByRole("button", { name: "Filters" });
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("button", { name: "Major" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ })).toBeInTheDocument();
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
  expect(screen.getByRole("button", { name: /^Shapes for C\/A, \d+ other shapes?$/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Shapes for C\/Ab, \d+ other shapes?$/ })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "C/Ab" } });
  expect(screen.getByRole("button", { name: /^Shapes for C\/Ab, \d+ other shapes?$/ })).toBeInTheDocument();
});

test("restores exploration options after the picker is reopened", () => {
  const props = { onHear: () => {}, onAdd: () => true, onClose: () => {}, sectionName: "Verse", activeEntryId: null };
  const first = render(<ChordPicker {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "D" }));
  fireEvent.click(screen.getByRole("button", { name: "Minor" }));
  fireEvent.click(screen.getByRole("radio", { name: "Frets 5–9" }));
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  first.unmount();

  render(<ChordPicker {...props} />);
  expect(screen.getByLabelText("Selected chord options")).toHaveTextContent("Root D");
  expect(screen.getByLabelText("Selected chord options")).toHaveTextContent("Type Minor");
  expect(screen.getByLabelText("Selected chord options")).toHaveTextContent("Frets 5–9");
  expect(screen.getByRole("button", { name: "D" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  expect(screen.getByRole("button", { name: "Minor" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("radio", { name: "Frets 5–9" })).toBeChecked();
});

test("restores an exact chord search and ignores invalid saved options", () => {
  const props = { onHear: () => {}, onAdd: () => true, onClose: () => {}, sectionName: "Verse", activeEntryId: null };
  const first = render(<ChordPicker {...props} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Search chords" }), { target: { value: "C/A" } });
  fireEvent.click(screen.getByText("C/A", { selector: ".chord-suggestions span" }));
  first.unmount();
  const second = render(<ChordPicker {...props} />);
  expect(screen.getByLabelText("Selected chord options")).toHaveTextContent("Chord C/A");
  expect(screen.getByLabelText("Selected chord options")).not.toHaveTextContent("Root C");
  expect(screen.getByRole("combobox", { name: "Search chords" })).toHaveValue("C/A");
  expect(screen.getByRole("button", { name: /^Shapes for C\/A, \d+ other shapes?$/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Shapes for C\/Ab, \d+ other shapes?$/ })).not.toBeInTheDocument();
  second.unmount();

  localStorage.setItem("mychords.pickerOptions.v1", JSON.stringify({ root: "H", category: "Other", region: "99" }));
  render(<ChordPicker {...props} />);
  expect(screen.getByLabelText("Selected chord options")).toHaveTextContent("Root C");
  expect(screen.getByRole("button", { name: "C" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("group", { name: "Chord categories" }).querySelector('button[aria-pressed="true"]')).toHaveTextContent("All");
  expect(screen.getByRole("radio", { name: "Whole neck" })).toBeChecked();
});
