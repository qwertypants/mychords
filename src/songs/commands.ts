import { createId } from "./createId";
import type { Song, Section } from "./types";
const stamp = (song: Song, sections: Section[]): Song => ({
  ...song,
  sections,
  updatedAt: new Date().toISOString(),
});
const SONG_NAME_WORDS = [
  "Apple",
  "Basket",
  "Button",
  "Candle",
  "Garden",
  "Market",
  "Morning",
  "Paper",
  "Pocket",
  "River",
  "Window",
  "Yellow",
  "Apricot",
  "Autumn",
  "Backpack",
  "Balcony",
  "Bicycle",
  "Blanket",
  "Breeze",
  "Bridge",
  "Bubble",
  "Buttonhole",
  "Camera",
  "Carpet",
  "Cedar",
  "Cellar",
  "Chalk",
  "Cherry",
  "Cloud",
  "Coast",
  "Coffee",
  "Compass",
  "Cookie",
  "Corner",
  "Cotton",
  "Creek",
  "Curtain",
  "Daisy",
  "Dinner",
  "Doorway",
  "Drawer",
  "Drizzle",
  "Envelope",
  "Evening",
  "Farmhouse",
  "Feather",
  "Fence",
  "Field",
  "Fireplace",
  "Flannel",
  "Flower",
  "Footpath",
  "Forest",
  "Fountain",
  "Friday",
  "Frost",
  "Glove",
  "Gravel",
  "Hallway",
  "Harbor",
  "Hearth",
  "Hillside",
  "Honey",
  "Jacket",
  "January",
  "Jar",
  "Kitchen",
  "Ladder",
  "Lantern",
  "Laundry",
  "Lemon",
  "Library",
  "Mailbox",
  "Meadow",
  "Midnight",
  "Milkshake",
  "Mittens",
  "Monday",
  "Moss",
  "Mountain",
  "Mug",
  "Notebook",
  "November",
  "Orchard",
  "Overcoat",
  "Pancake",
  "Peach",
  "Pearl",
  "Pencil",
  "Picnic",
  "Pillow",
  "Pinecone",
  "Postcard",
  "Raincoat",
  "Rooftop",
  "Saturday",
  "Seashell",
  "Sidewalk",
  "Skylight",
  "Snowfall",
  "Socks",
  "Staircase",
  "Station",
  "Strawberry",
  "Sunday",
  "Teacup",
  "Thunder",
  "Thursday",
  "Toaster",
  "Tuesday",
  "Umbrella",
  "Valley",
  "Violet",
  "Walkway",
  "Wardrobe",
  "Wednesday",
  "Whistle",
  "Wool",
];
function randomSongName(): string {
  const pickWord = () => SONG_NAME_WORDS[Math.floor(Math.random() * SONG_NAME_WORDS.length)];
  return Math.random() < 0.5 ? pickWord() : `${pickWord()} ${pickWord()}`;
}
export function newSong(name = randomSongName()): Song {
  return {
    id: createId(),
    name,
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}
export function addSection(song: Song, name: string): Song {
  return stamp(song, [
    ...song.sections,
    { id: createId(), name, chords: [] },
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
    chords: [...s.chords, { id: createId(), voicingId }],
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
export function replaceChordVoicing(
  song: Song,
  sectionId: string,
  entryId: string,
  voicingId: string,
): Song {
  const entry = song.sections.find((s) => s.id === sectionId)?.chords.find((c) => c.id === entryId);
  if (!entry || entry.voicingId === voicingId) return song;
  return editSection(song, sectionId, (s) => ({
    ...s,
    chords: s.chords.map((c) => c.id === entryId ? { ...c, voicingId } : c),
  }));
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
