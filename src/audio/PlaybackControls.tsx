import { Play, Square, Volume2, LoaderCircle } from "lucide-react";
import type { PlaybackState } from "./guitar";
export function PlaybackControls({
  state,
  onStop,
}: {
  state: PlaybackState;
  onStop: () => void;
}) {
  return (
    <div className={`playback-status ${state.status}`} role="status">
      {state.status === "loading" ? (
        <LoaderCircle size={16} className="loading-icon" />
      ) : state.status === "playing" ? (
        <Play size={15} />
      ) : (
        <Volume2 size={16} />
      )}
      <span>
        {state.message ??
          (state.status === "playing" ? "Acoustic preview" : "Acoustic guitar")}
      </span>
      {(state.status === "playing" || state.status === "loading") && (
        <button onClick={onStop} aria-label="Stop playback">
          <Square size={14} />
          Stop
        </button>
      )}
    </div>
  );
}
