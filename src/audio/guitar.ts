import { z } from "zod";
import { midiForFrets, midiForString } from "../chords/pitch";
import type { Voicing } from "../chords/types";
export type PreviewItem = { entryId: string; voicing: Voicing; stringIndex?: number };
export type PlaybackState = {
  status: "idle" | "loading" | "playing" | "error";
  activeEntryId: string | null;
  message: string | null;
  strumInterval?: number;
};
export interface GuitarPlayer {
  play(
    items: readonly PreviewItem[],
    onState: (s: PlaybackState) => void,
    speed?: StrumSpeed,
  ): Promise<void>;
  stop(): void;
  dispose(): void;
}
export const STRUM_INTERVALS = { slow: 0.1, normal: 0.025, together: 0 } as const;
export type StrumSpeed = keyof typeof STRUM_INTERVALS;
const CHORD_INTERVAL = 1.8;
const NOTE_DURATION = 1.65;
const START_DELAY = 0.05;
const RESUME_TIMEOUT = 3000;

export function previewEntryId(source: "library" | "picker" | "song", id: string) {
  return `${source}:${id}`;
}

export function planStrums(
  items: readonly PreviewItem[],
  speed: StrumSpeed = "normal",
) {
  const interval = STRUM_INTERVALS[speed];
  return items.flatMap((item, index) => {
    const chordStart = index * CHORD_INTERVAL;
    if (item.stringIndex !== undefined) {
      const midi = midiForString(item.voicing.frets, item.stringIndex);
      return midi === null ? [] : [{ entryId: item.entryId, midi, at: chordStart }];
    }
    return midiForFrets(item.voicing.frets).map((midi, stringIndex) => ({
      entryId: item.entryId,
      midi,
      at: chordStart + stringIndex * interval,
    }));
  });
}
export function nearestSample(
  midi: number,
  available: readonly number[],
): number {
  if (!available.length) throw new Error("No guitar samples");
  return [...available].sort(
    (a, b) => Math.abs(midi - a) - Math.abs(midi - b) || a - b,
  )[0];
}
const manifestSchema = z.object({
  samples: z
    .array(
      z.object({
        midi: z.number().int(),
        file: z.string().regex(/^guitar\/[A-G][0-9]\.mp3$/),
      }),
    )
    .min(1),
});
const idle: PlaybackState = {
  status: "idle",
  activeEntryId: null,
  message: null,
};
export function prefersMediaPlayback() {
  return /iP(hone|ad|od)/.test(navigator.userAgent)
    && (window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

async function resumeWithTimeout(context: AudioContext) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Audio context did not resume")), RESUME_TIMEOUT);
      }),
    ]);
    if (context.state !== "running") throw new Error("Audio context is not running");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createGuitarPlayer(): GuitarPlayer {
  let context: AudioContext | null = null;
  let buffers: Promise<Map<number, AudioBuffer>> | null = null;
  let run = 0;
  let disposed = false;
  let notify: (s: PlaybackState) => void = () => {};
  const sources = new Set<AudioBufferSourceNode>();
  const gains = new Set<GainNode>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  function stop() {
    run++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* A source may have ended before Stop. */
      }
      source.disconnect();
    }
    sources.clear();
    for (const gain of gains) gain.disconnect();
    gains.clear();
    notify(idle);
  }
  function load(ctx: AudioContext): Promise<Map<number, AudioBuffer>> {
    if (buffers) return buffers;
    buffers = (async () => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}audio/manifest.json`,
      );
      if (!response.ok) throw new Error("Sample manifest unavailable");
      const manifest = manifestSchema.parse(await response.json());
      const loaded = await Promise.all(
        manifest.samples.map(async (sample) => {
          const response = await fetch(
            `${import.meta.env.BASE_URL}audio/${sample.file}`,
          );
          if (!response.ok) throw new Error("Guitar sample unavailable");
          const buffer = await ctx.decodeAudioData(
            await response.arrayBuffer(),
          );
          return { midi: sample.midi, buffer };
        }),
      );
      return new Map(loaded.map((s) => [s.midi, s.buffer]));
    })().catch((error) => {
      buffers = null;
      throw error;
    });
    return buffers;
  }
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };
  return {
    async play(items, onState, speed = "normal") {
      stop();
      notify = onState;
      const token = run;
      if (disposed || !items.length) {
        notify(idle);
        return;
      }
      try {
        context ??= new AudioContext();
        // Resume is invoked before the first await to preserve the tap's activation.
        const resumed = resumeWithTimeout(context);
        notify({
          status: "loading",
          activeEntryId: null,
          message: "Loading acoustic guitar…",
        });
        await resumed;
        const loaded = await load(context);
        if (token !== run || disposed) return;
        const start = context.currentTime + START_DELAY;
        const keys = [...loaded.keys()];
        const events = planStrums(items, speed);
        for (const event of events) {
          const sample = nearestSample(event.midi, keys),
            buffer = loaded.get(sample);
          if (!buffer) throw new Error("Missing decoded sample");
          const source = context.createBufferSource(),
            gain = context.createGain();
          source.buffer = buffer;
          source.playbackRate.value = 2 ** ((event.midi - sample) / 12);
          const at = start + event.at;
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.12, at + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.015, at + 1.5);
          gain.gain.linearRampToValueAtTime(0, at + 1.6);
          source.connect(gain);
          gain.connect(context.destination);
          sources.add(source);
          gains.add(gain);
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
            sources.delete(source);
            gains.delete(gain);
          };
          source.start(at);
          source.stop(at + NOTE_DURATION);
        }
        items.forEach((item, index) =>
          later(
            () => {
              if (token === run)
                notify({
                  status: "playing",
                  activeEntryId: item.entryId,
                  message: null,
                  strumInterval: STRUM_INTERVALS[speed],
                });
            },
            (START_DELAY + index * CHORD_INTERVAL) * 1000,
          ),
        );
        const lastNoteEnd = (events.at(-1)?.at ?? 0) + NOTE_DURATION;
        const previewEnd = Math.max(items.length * CHORD_INTERVAL, lastNoteEnd);
        later(
          () => {
            if (token === run) stop();
          },
          Math.ceil((START_DELAY + previewEnd) * 1000),
        );
      } catch {
        if (token !== run || disposed) return;
        stop();
        if (context) void context.close().catch(() => {});
        context = null;
        buffers = null;
        notify({
          status: "error",
          activeEntryId: null,
          message: "Could not load guitar sound. Try again.",
        });
      }
    },
    stop,
    dispose() {
      stop();
      disposed = true;
      if (context) void context.close().catch(() => {});
    },
  };
}

export function createMediaGuitarPlayer(): GuitarPlayer {
  let manifest: Promise<z.infer<typeof manifestSchema>> | null = null;
  let run = 0;
  let disposed = false;
  let notify: (s: PlaybackState) => void = () => {};
  const media = new Set<HTMLAudioElement>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };
  function stop() {
    run++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const audio of media) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    media.clear();
    notify(idle);
  }
  function loadManifest() {
    manifest ??= fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Sample manifest unavailable");
        return response.json();
      })
      .then((json) => manifestSchema.parse(json))
      .catch((error) => {
        manifest = null;
        throw error;
      });
    return manifest;
  }
  return {
    async play(items, onState, speed = "normal") {
      stop();
      notify = onState;
      const token = run;
      if (disposed || !items.length) return;
      try {
        notify({ status: "loading", activeEntryId: null, message: "Loading acoustic guitar…" });
        const samples = (await loadManifest()).samples;
        if (token !== run || disposed) return;
        const byMidi = new Map(samples.map((sample) => [sample.midi, sample.file]));
        const keys = [...byMidi.keys()];
        const events = planStrums(items, speed);
        let latestStartedAt = -1;
        for (const event of events) {
          const sample = nearestSample(event.midi, keys);
          const file = byMidi.get(sample);
          if (!file) throw new Error("Missing guitar sample");
          const audio = new Audio(`${import.meta.env.BASE_URL}audio/${file}`);
          audio.preload = "auto";
          audio.preservesPitch = false;
          audio.playbackRate = 2 ** ((event.midi - sample) / 12);
          audio.volume = 0.12;
          media.add(audio);
          const start = () => {
            if (token !== run || disposed) return;
            void audio.play().then(() => {
              if (token !== run || disposed || event.at < latestStartedAt) return;
              latestStartedAt = event.at;
              notify({
                status: "playing",
                activeEntryId: event.entryId,
                message: null,
                strumInterval: STRUM_INTERVALS[speed],
              });
            }).catch(() => {
              if (token !== run || disposed) return;
              stop();
              notify({ status: "error", activeEntryId: null, message: "Could not play guitar sound. Try again." });
            });
          };
          if (event.at === 0) start();
          else later(start, event.at * 1000);
        }
        const lastNoteEnd = (events.at(-1)?.at ?? 0) + NOTE_DURATION;
        const previewEnd = Math.max(items.length * CHORD_INTERVAL, lastNoteEnd);
        later(() => { if (token === run) stop(); }, Math.ceil(previewEnd * 1000));
      } catch {
        if (token !== run || disposed) return;
        stop();
        notify({ status: "error", activeEntryId: null, message: "Could not load guitar sound. Try again." });
      }
    },
    stop,
    dispose() {
      stop();
      disposed = true;
    },
  };
}
