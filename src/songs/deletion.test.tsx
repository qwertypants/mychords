import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import App from "../App";
import { catalog } from "../chords/catalog";
import { STORAGE_KEY } from "./storage";
import type { Library, Song } from "./types";

HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };

function savedSong(): Song {
  return {
    id: "song", name: "Idea", updatedAt: "2026-11-27T12:00:00.000Z",
    sections: [
      { id: "verse", name: "Verse", chords: [
        { id: "first", voicingId: catalog[0].id },
        { id: "second", voicingId: catalog[0].id },
        { id: "third", voicingId: catalog[1].id },
      ] },
      { id: "empty", name: "Chorus", chords: [] },
    ],
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, songs: [savedSong()] }));
  window.history.replaceState(null, "", "/songs/song");
});

test("chord removal waits for confirmation and preserves other occurrences and voicings", () => {
  const view = render(<App />);
  const original = localStorage.getItem(STORAGE_KEY);
  const removeName = `Remove ${catalog[0].label}, position 2`;
  fireEvent.click(screen.getByRole("button", { name: removeName }));
  let dialog = screen.getByRole("dialog", { name: "Remove this chord?" });
  expect(dialog).toHaveTextContent(`${catalog[0].label} at position 2 in Verse`);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: removeName }));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: removeName }));
  dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Remove chord" }));
  const library: Library = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(library.songs[0].sections[0].chords).toEqual([
    { id: "first", voicingId: catalog[0].id },
    { id: "third", voicingId: catalog[1].id },
  ]);
  view.unmount();
  render(<App />);
  expect([...document.querySelectorAll("[data-entry-id]")].map((card) => card.getAttribute("data-entry-id"))).toEqual(["first", "third"]);
});

test.each(["Verse", "Chorus"])("%s section removal waits for confirmation even when empty", (name) => {
  const view = render(<App />);
  const original = localStorage.getItem(STORAGE_KEY);
  const remove = () => fireEvent.click(screen.getByRole("button", { name: `Remove section ${name}` }));
  remove();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  remove();
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  remove();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove section" }));
  view.unmount();
  render(<App />);
  expect(screen.queryByRole("button", { name: `Remove section ${name}` })).not.toBeInTheDocument();
  expect(screen.getAllByLabelText("Section name")).toHaveLength(1);
});
