import { useEffect, useRef, useState } from "react";
import { createGuitarPlayer, createMediaGuitarPlayer, prefersMediaPlayback, STRUM_INTERVALS } from "./guitar";
import type { PreviewItem, GuitarPlayer, PlaybackState, StrumSpeed } from "./guitar";

const STRUM_SPEED_KEY = "mychords.strumSpeed";

function readStrumSpeed(): StrumSpeed {
  try {
    const saved = localStorage.getItem(STRUM_SPEED_KEY);
    if (saved && Object.hasOwn(STRUM_INTERVALS, saved)) return saved as StrumSpeed;
  } catch {
    // Browser storage may be unavailable.
  }
  return "normal";
}
export function usePlayback() {
  const player = useRef<GuitarPlayer | null>(null);
  const [strumSpeed, setStrumSpeed] = useState(readStrumSpeed);
  const [state, setState] = useState<PlaybackState>({
    status: "idle",
    activeEntryId: null,
    message: null,
  });
  useEffect(() => {
    const mediaPlayback = prefersMediaPlayback();
    if (mediaPlayback) player.current = createMediaGuitarPlayer();
    const hidden = () => {
      if (document.hidden) {
        if (mediaPlayback) player.current?.stop();
        else {
          player.current?.dispose();
          player.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      player.current?.dispose();
      player.current = null;
    };
  }, []);
  return {
    state,
    strumSpeed,
    changeStrumSpeed: (speed: StrumSpeed) => {
      setStrumSpeed(speed);
      try {
        localStorage.setItem(STRUM_SPEED_KEY, speed);
      } catch {
        // Keep the selection for the current session.
      }
    },
    play: (items: readonly PreviewItem[]) => {
      player.current ??= prefersMediaPlayback()
        ? createMediaGuitarPlayer()
        : createGuitarPlayer();
      void player.current.play(items, setState, strumSpeed);
    },
    stop: () => player.current?.stop(),
  };
}
