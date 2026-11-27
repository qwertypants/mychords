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
  readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
  currentTime = 0;
  play = vi.fn(async () => {
    if (rejectPlayback) throw new Error("Playback blocked");
  });
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor(src = "") {
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
  window.history.replaceState({}, "", "/");
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
  expect(instances[0].currentTime).toBe(0.04);
  expect(instances[0].play).toHaveBeenCalledOnce();
  expect(states.at(-1)?.status).toBe("playing");
  player.stop();
  expect(instances[0].pause).toHaveBeenCalledOnce();
  expect(states.at(-1)?.status).toBe("idle");
  player.dispose();
});

test("a warm tap reuses its ready voice and calls play without waiting", async () => {
  const player = createMediaGuitarPlayer();
  const item = { entryId: "one", voicing: catalog[0], stringIndex: 1 };
  await player.play([item], () => {});
  await Promise.resolve();
  const voice = instances[0];
  player.stop();
  const pending = player.play([item], () => {});
  expect(voice.play).toHaveBeenCalledTimes(2);
  expect(instances).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(voice.load).toHaveBeenCalledTimes(1);
  await pending;
  player.dispose();
});

test("audio URLs stay rooted when a song is opened directly", async () => {
  window.history.replaceState({}, "", "/mychords/songs/direct-link");
  const player = createMediaGuitarPlayer();
  const item = { entryId: "one", voicing: catalog[0], stringIndex: 1 };
  await player.play([item], () => {});
  expect(fetch).toHaveBeenCalledWith("/mychords/audio/manifest.json");
  expect(instances[0].src).toBe("/mychords/audio/guitar/E2.mp3");
  player.dispose();
});

test("later strings wait for the first note to start and get separate voices", async () => {
  const player = createMediaGuitarPlayer();
  const item = { entryId: "one", voicing: catalog[0] };
  await player.play([item], () => {});
  player.stop();
  const first = instances[0];
  let startFirst: () => void = () => {};
  first.play.mockImplementationOnce(() => new Promise<void>((resolve) => { startFirst = resolve; }));
  await player.play([item], () => {});
  await vi.advanceTimersByTimeAsync(100);
  expect(instances).toHaveLength(1);
  expect(instances.slice(1).every((voice) => voice.play.mock.calls.length === 0)).toBe(true);
  startFirst();
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(26);
  expect(instances.slice(1).some((voice) => voice.play.mock.calls.length > 0)).toBe(true);
  player.dispose();
});

test("a stopped pending note cannot start the rest of its strum", async () => {
  const player = createMediaGuitarPlayer();
  const item = { entryId: "one", voicing: catalog[0] };
  await player.play([item], () => {});
  player.stop();
  const first = instances[0];
  let startFirst: () => void = () => {};
  first.play.mockImplementationOnce(() => new Promise<void>((resolve) => { startFirst = resolve; }));
  await player.play([item], () => {});
  player.stop();
  startFirst();
  await vi.runAllTimersAsync();
  expect(instances).toHaveLength(1);
  expect(instances.slice(1).every((voice) => voice.play.mock.calls.length === 0)).toBe(true);
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
