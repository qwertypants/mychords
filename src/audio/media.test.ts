import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { catalog } from "../chords/catalog";
import { createMediaGuitarPlayer, prefersMediaPlayback } from "./guitar";
import type { PlaybackState } from "./guitar";

const instances: FakeAudio[] = [];
let rejectPlayback = false;
class FakeAudio {
  src: string;
  preload = "";
  preservesPitch = true;
  playbackRate = 1;
  volume = 1;
  play = vi.fn(async () => {
    if (rejectPlayback) throw new Error("Playback blocked");
  });
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor(src: string) {
    this.src = src;
    instances.push(this);
  }
}

beforeEach(() => {
  instances.length = 0;
  rejectPlayback = false;
  vi.useFakeTimers();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    samples: [{ midi: 40, file: "guitar/E2.mp3" }],
  }))));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("installed iPhone selects media playback; Android stays on Web Audio", () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
  vi.stubGlobal("navigator", { userAgent: "iPhone", standalone: true });
  expect(prefersMediaPlayback()).toBe(true);
  vi.stubGlobal("navigator", { userAgent: "Android", standalone: false });
  expect(prefersMediaPlayback()).toBe(false);
});

test("media playback shifts sample pitch, reports a started note, and stops", async () => {
  const player = createMediaGuitarPlayer();
  const states: PlaybackState[] = [];
  await player.play([{ entryId: "one", voicing: catalog[0], stringIndex: 1 }], (state) => states.push(state));
  await Promise.resolve();
  expect(instances).toHaveLength(1);
  expect(instances[0].preservesPitch).toBe(false);
  expect(instances[0].playbackRate).toBeGreaterThan(1);
  expect(instances[0].play).toHaveBeenCalledOnce();
  expect(states.at(-1)?.status).toBe("playing");
  player.stop();
  expect(instances[0].pause).toHaveBeenCalledOnce();
  expect(states.at(-1)?.status).toBe("idle");
  player.dispose();
});

test("rejected media playback is visible and can be retried", async () => {
  rejectPlayback = true;
  const player = createMediaGuitarPlayer();
  const states: PlaybackState[] = [];
  const item = { entryId: "one", voicing: catalog[0], stringIndex: 1 };
  await player.play([item], (state) => states.push(state));
  await Promise.resolve();
  expect(states.at(-1)?.status).toBe("error");
  rejectPlayback = false;
  await player.play([item], (state) => states.push(state));
  await Promise.resolve();
  expect(states.at(-1)?.status).toBe("playing");
  player.dispose();
});
