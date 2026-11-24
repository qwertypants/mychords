import type { Song, Section } from "./types";
const stamp = (song: Song, sections: Section[]): Song => ({
  ...song,
  sections,
  updatedAt: new Date().toISOString(),
});
export function newSong(name: string): Song {
  return {
    id: crypto.randomUUID(),
    name,
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}
export function addSection(song: Song, name: string): Song {
  return stamp(song, [
    ...song.sections,
    { id: crypto.randomUUID(), name, chords: [] },
  ]);
}
function editSection(
  song: Song,
  id: string,
  edit: (s: Section) => Section,
): Song {
  if (!song.sections.some((s) => s.id === id)) return song;
  return stamp(
    song,
    song.sections.map((s) => (s.id === id ? edit(s) : s)),
  );
}
export function addChord(
  song: Song,
  sectionId: string,
  voicingId: string,
): Song {
  return editSection(song, sectionId, (s) => ({
    ...s,
    chords: [...s.chords, { id: crypto.randomUUID(), voicingId }],
  }));
}
export function moveChord(
  song: Song,
  sectionId: string,
  entryId: string,
  targetIndex: number,
): Song {
  const section = song.sections.find((s) => s.id === sectionId);
  if (!section || !section.chords.some((c) => c.id === entryId)) return song;
  return editSection(song, sectionId, (s) => {
    const chords = [...s.chords];
    const [entry] = chords.splice(
      chords.findIndex((c) => c.id === entryId),
      1,
    );
    chords.splice(Math.max(0, Math.min(chords.length, targetIndex)), 0, entry);
    return { ...s, chords };
  });
}
export function removeChord(
  song: Song,
  sectionId: string,
  entryId: string,
): Song {
  return editSection(song, sectionId, (s) => ({
    ...s,
    chords: s.chords.filter((c) => c.id !== entryId),
  }));
}
export function renameSong(song: Song, name: string): Song {
  return { ...song, name, updatedAt: new Date().toISOString() };
}
export function renameSection(
  song: Song,
  sectionId: string,
  name: string,
): Song {
  return editSection(song, sectionId, (s) => ({ ...s, name }));
}
export function removeSection(song: Song, sectionId: string): Song {
  return stamp(
    song,
    song.sections.filter((s) => s.id !== sectionId),
  );
}
