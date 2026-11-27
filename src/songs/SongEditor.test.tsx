import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, beforeEach, vi } from "vitest";
import App from "../App";
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});
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
  fireEvent.click(screen.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add C, 8 10 10 9 8 8" }));
  fireEvent.click(screen.getByRole("button", { name: "Close chord library" }));
  expect(screen.queryByRole("button", { name: "Play song" })).not.toBeInTheDocument();
  view.unmount();
  render(<App />);
  expect(window.location.pathname).toMatch(/^\/songs\/[^/]+$/);
  expect(screen.getByLabelText("Song name", { exact: true })).toHaveValue(
    "Idea",
  );
  expect(screen.getAllByLabelText("Section name")[0]).toHaveValue("Verse");
  expect(screen.getAllByLabelText("Section name")[1]).toHaveValue("Chorus");
  expect(document.querySelectorAll("[data-entry-id]")).toHaveLength(3);
});
test("autosaved edits navigate without a confirmation", () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
  fireEvent.change(screen.getByLabelText("Song name"), { target: { value: "Keep this" } });
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "All songs" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Keep this" }));
  expect(screen.getByLabelText("Song name")).toHaveValue("Keep this");
});
test("failed autosave keeps the edit and retries it", () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Full"); });
  try {
    fireEvent.change(screen.getByLabelText("Song name"), { target: { value: "Recovered idea" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByLabelText("Song name")).toHaveValue("Recovered idea");
    write.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All songs" }));
    expect(screen.getByRole("button", { name: "Open Recovered idea" })).toBeInTheDocument();
  } finally {
    write.mockRestore();
  }
});

test("share confirms a successful copy and restores the icon after 1.5 seconds", async () => {
  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  vi.useFakeTimers();
  try {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
    const share = screen.getByRole("button", { name: "Share" });

    await act(async () => {
      fireEvent.click(share);
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Copied");
    expect(share).toHaveAccessibleDescription("Copied");

    act(() => { vi.advanceTimersByTime(1000); });
    await act(async () => {
      fireEvent.click(share);
      await Promise.resolve();
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(share).not.toHaveAttribute("aria-describedby");
  } finally {
    vi.useRealTimers();
    if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
    else Reflect.deleteProperty(navigator, "clipboard");
  }
});

test("failed share copy does not open a modal", async () => {
  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("Clipboard unavailable")) },
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn().mockReturnValue(false),
  });
  try {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "New song" })[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByText("Could not copy link. Allow clipboard access and try again.")).toBeInTheDocument();
  } finally {
    if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
    else Reflect.deleteProperty(navigator, "clipboard");
    if (execCommandDescriptor) Object.defineProperty(document, "execCommand", execCommandDescriptor);
    else Reflect.deleteProperty(document, "execCommand");
  }
});
