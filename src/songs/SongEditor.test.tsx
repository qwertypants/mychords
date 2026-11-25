import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, beforeEach } from "vitest";
import App from "../App";
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
beforeEach(() => localStorage.clear());
test("compose, save and reopen a song with exact repeated voicings", () => {
  const view = render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
  fireEvent.change(screen.getByLabelText("Song name", { exact: true }), {
    target: { value: "Idea" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add section" }));
  fireEvent.change(screen.getAllByLabelText("Section name")[1], {
    target: { value: "Chorus" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Add chord" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Major" }));
  const add = screen.getByRole("button", { name: "Add C, -1 3 2 0 1 0" });
  fireEvent.click(add);
  fireEvent.click(add);
  fireEvent.click(screen.getByRole("button", { name: "Shapes for C" }));
  fireEvent.click(screen.getByRole("button", { name: "Add C, 8 10 10 9 8 8" }));
  fireEvent.click(screen.getByRole("button", { name: "Close chord library" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.queryByRole("button", { name: "Play song" })).not.toBeInTheDocument();
  view.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open Idea" }));
  expect(screen.getByLabelText("Song name", { exact: true })).toHaveValue(
    "Idea",
  );
  expect(screen.getAllByLabelText("Section name")[0]).toHaveValue("Verse");
  expect(screen.getAllByLabelText("Section name")[1]).toHaveValue("Chorus");
  expect(document.querySelectorAll("[data-entry-id]")).toHaveLength(3);
});
test("unsaved navigation can be cancelled or discarded", () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
  fireEvent.change(screen.getByLabelText("Song name"), {
    target: { value: "Keep this" },
  });
  fireEvent.click(screen.getByRole("button", { name: "All songs" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Song name")).toHaveValue("Keep this");
  fireEvent.click(screen.getByRole("button", { name: "All songs" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.queryByLabelText("Song name")).not.toBeInTheDocument();
});
