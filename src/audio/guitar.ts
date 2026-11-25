import { z } from "zod";
import { midiForFrets, midiForString } from "../chords/pitch";
import type { Voicing } from "../chords/types";
export type PreviewItem = { entryId: string; voicing: Voicing; stringIndex?: number };
export type PlaybackState = {
  status: "idle" | "loading" | "playing" | "error";
  activeEntryId: string | null;
  message: string | null;
};
export interface GuitarPlayer {
  play(
    items: readonly PreviewItem[],
    onState: (s: PlaybackState) => void,
  ): Promise<void>;
  stop(): void;
  dispose(): void;
}
export const STRUM_STRING_INTERVAL = 0.025;

export function previewEntryId(source: "library" | "picker" | "song", id: string) {
  return `${source}:${id}`;
}

export function planStrums(items: readonly PreviewItem[]) {
  return items.flatMap((item, index) => {
    if (item.stringIndex !== undefined) {
      const midi = midiForString(item.voicing.frets, item.stringIndex);
      return midi === null ? [] : [{ entryId: item.entryId, midi, at: index * 1.8 }];
    }
    return midiForFrets(item.voicing.frets).map((midi, stringIndex) => ({
      entryId: item.entryId,
      midi,
      at: index * 1.8 + stringIndex * STRUM_STRING_INTERVAL,
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
    async play(items, onState) {
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
        const resumed = context.resume();
        notify({
          status: "loading",
          activeEntryId: null,
          message: "Loading acoustic guitar…",
        });
        await resumed;
        const loaded = await load(context);
        if (token !== run || disposed) return;
        const start = context.currentTime + 0.05;
        const keys = [...loaded.keys()];
        for (const event of planStrums(items)) {
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
          source.stop(at + 1.65);
        }
        items.forEach((item, index) =>
          later(
            () => {
              if (token === run)
                notify({
                  status: "playing",
                  activeEntryId: item.entryId,
                  message: null,
                });
            },
            50 + index * 1800,
          ),
        );
        later(
          () => {
            if (token === run) stop();
          },
          50 + (items.length - 1) * 1800 + 1800,
        );
      } catch {
        if (token !== run || disposed) return;
        stop();
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
