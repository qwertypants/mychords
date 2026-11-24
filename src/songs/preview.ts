import type { Song } from "./types";
import type { PreviewItem } from "../audio/guitar";
import { getVoicing } from "../chords/catalog";
export function songPreview(song: Song, sectionId?: string): PreviewItem[] {
  return song.sections
    .filter((s) => !sectionId || s.id === sectionId)
    .flatMap((s) =>
      s.chords.flatMap((c) => {
        const voicing = getVoicing(c.voicingId);
        return voicing ? [{ entryId: c.id, voicing }] : [];
      }),
    );
}
