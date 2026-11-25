import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PwaControls } from "./PwaControls";

afterEach(() => vi.restoreAllMocks());

test("installation appears when offered, invokes the browser prompt, and hides when installed", async () => {
  render(<PwaControls />);
  expect(screen.queryByRole("button", { name: "Install MyChords" })).toBeNull();
  const prompt = vi.fn(async () => {});
  const offered = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  act(() => { window.dispatchEvent(offered); });
  expect(offered.defaultPrevented).toBe(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Install MyChords" })); });
  expect(prompt).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Install MyChords" })).toBeNull();
});

test("dismissed installation can be offered again", async () => {
  render(<PwaControls />);
  const offer = () => Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  act(() => { window.dispatchEvent(offer()); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Install MyChords" })); });
  expect(screen.queryByRole("button", { name: "Install MyChords" })).toBeNull();
  act(() => { window.dispatchEvent(offer()); });
  expect(screen.getByRole("button", { name: "Install MyChords" })).toBeVisible();
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(screen.queryByRole("button", { name: "Install MyChords" })).toBeNull();
});

test("standalone mode hides the iPhone install control", () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
  const media = window.matchMedia("(display-mode: standalone)");
  vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
  render(<PwaControls />);
  expect(screen.queryByRole("button", { name: "Install MyChords" })).toBeNull();
});

test("an installation error provides browser-menu instructions", async () => {
  render(<PwaControls />);
  const offered = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => { throw new Error("Unavailable"); },
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  act(() => { window.dispatchEvent(offered); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Install MyChords" })); });
  expect(screen.getByRole("alert")).toHaveTextContent("Use your browser’s install menu");
});

test("iPhone instructions open only on request and return focus on dismissal", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
  render(<PwaControls />);
  const button = screen.getByRole("button", { name: "Install MyChords" });
  expect(screen.queryByRole("dialog")).toBeNull();
  // jsdom has no native modal implementation.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  button.focus();
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "Install MyChords" })).toHaveTextContent("Add to Home Screen");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Cancel" })); });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(button).toHaveFocus();
});
