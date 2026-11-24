import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createGuitarPlayer } from "./guitar";
import type { PlaybackState } from "./guitar";
import { catalog } from "../chords/catalog";
const nodes: {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];
class FakeContext {
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => ({ duration: 2 }));
  createBufferSource() {
    const node = {
      buffer: null,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    nodes.push(node);
    return node;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}
const item = { entryId: "one", voicing: catalog[0] };
const manifest = () =>
  new Response(
    JSON.stringify({ samples: [{ midi: 40, file: "guitar/E2.mp3" }] }),
  );
const okFetch = () =>
  vi.fn(async (url: string) =>
    url.endsWith("manifest.json")
      ? manifest()
      : new Response(new Uint8Array([1, 2])),
  );
beforeEach(() => {
  nodes.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("fetch", okFetch());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("Stop during loading prevents a late decode from making sound", async () => {
  let resolve: (r: Response) => void = () => {};
  const waiting = new Promise<Response>((r) => {
    resolve = r;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => waiting),
  );
  const player = createGuitarPlayer(),
    states: PlaybackState[] = [];
  const pending = player.play([item], (s) => states.push(s));
  player.stop();
  resolve(manifest());
  await pending;
  expect(nodes).toHaveLength(0);
  expect(states.at(-1)?.status).toBe("idle");
  player.dispose();
});
test("a newer Hear supersedes the previous run and Stop cleans up sources", async () => {
  const player = createGuitarPlayer(),
    states: PlaybackState[] = [];
  await player.play([item], (s) => states.push(s));
  const first = [...nodes];
  await player.play([{ ...item, entryId: "two" }], (s) => states.push(s));
  expect(first.every((n) => n.stop.mock.calls.length === 2)).toBe(true);
  await vi.advanceTimersByTimeAsync(60);
  expect(states.at(-1)?.activeEntryId).toBe("two");
  player.stop();
  expect(states.at(-1)?.status).toBe("idle");
  expect(nodes.every((n) => n.disconnect.mock.calls.length > 0)).toBe(true);
  await vi.runAllTimersAsync();
  expect(states.at(-1)?.status).toBe("idle");
  player.dispose();
});
test("failed load can be retried; empty playback is idle", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 503 })),
  );
  const player = createGuitarPlayer(),
    states: PlaybackState[] = [];
  await player.play([item], (s) => states.push(s));
  expect(states.at(-1)?.status).toBe("error");
  vi.stubGlobal("fetch", okFetch());
  await player.play([item], (s) => states.push(s));
  expect(nodes.length).toBeGreaterThan(0);
  await player.play([], (s) => states.push(s));
  expect(states.at(-1)?.status).toBe("idle");
  player.dispose();
});
