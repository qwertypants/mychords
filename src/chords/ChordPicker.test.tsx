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
