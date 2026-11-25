import { z } from "zod";
import { getVoicing } from "../chords/catalog";
import type { Song } from "./types";

export const MAX_SHARE_URL = 8000;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const snapshotSchema = z.object({
  version: z.literal(1),
  name: z.string().max(200),
  sections: z.array(z.object({
    name: z.string().max(200),
    chords: z.array(z.string().min(1).refine((id) => Boolean(getVoicing(id)))),
  })),
});

export function createShareUrl(song: Song, location: string): string {
  const snapshot = snapshotSchema.parse({
    version: 1,
    name: song.name,
    sections: song.sections.map((section) => ({
      name: section.name,
      chords: section.chords.map((chord) => chord.voicingId),
    })),
  });
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  if (bytes.length > MAX_PAYLOAD_BYTES) throw new Error("This song is too large to share as a link.");
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const url = new URL(location);
  url.search = "";
  url.hash = "";
  url.searchParams.set("song", encoded);
  if (url.href.length > MAX_SHARE_URL) throw new Error("This song is too large to share as a link.");
  return url.href;
}

export function readSharedSong(location: string): Song | null {
  const url = new URL(location);
  const values = url.searchParams.getAll("song");
  if (!values.length) return null;
  try {
    const encoded = values[0];
    if (values.length !== 1 || url.href.length > MAX_SHARE_URL || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error();
    const bytes = Uint8Array.from(atob(encoded.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_PAYLOAD_BYTES) throw new Error();
    const snapshot = snapshotSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    return {
      id: crypto.randomUUID(), name: snapshot.name, updatedAt: new Date().toISOString(),
      sections: snapshot.sections.map((section) => ({
        id: crypto.randomUUID(), name: section.name,
        chords: section.chords.map((voicingId) => ({ id: crypto.randomUUID(), voicingId })),
      })),
    };
  } catch {
    throw new Error("This shared song link is invalid, unsupported, or too large. Your saved songs have not changed.");
  }
}
