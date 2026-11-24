import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const commit = "622c2f1c32c8cfce4158ddc3eb26e518ddef37e5";
const notes = {
  E2: 40,
  A2: 45,
  D3: 50,
  G3: 55,
  B3: 59,
  E4: 64,
  A4: 69,
  C5: 72,
  D5: 74,
};
await mkdir("public/audio/guitar", { recursive: true });
const samples = [];
for (const [note, midi] of Object.entries(notes)) {
  const response = await fetch(
    `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/${commit}/samples/guitar-acoustic/${note}.mp3`,
  );
  if (!response.ok) throw new Error(`Sample ${note}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(`public/audio/guitar/${note}.mp3`, buffer);
  samples.push({
    midi,
    file: `guitar/${note}.mp3`,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}
await writeFile(
  "public/audio/manifest.json",
  JSON.stringify({ commit, samples }, null, 2) + "\n",
);
console.log(`Bundled ${samples.length} acoustic guitar samples.`);
