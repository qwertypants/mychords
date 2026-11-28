import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ROOTS, pitchIssue, EXTENDED, omissionsFor } from "./chord-rules.mjs";
const input = readFileSync("vendor/chords/guitar.json");
const source = JSON.parse(input);
const canonical = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const records = new Map();
const rejected = [];
const corrections = [];
function add(v) {
  records.set(v.id, v);
}
for (const chords of Object.values(source.chords))
  for (const chord of chords)
    for (const p of chord.positions) {
      const root = canonical[ROOTS[chord.key]],
        suffix = chord.suffix;
      const frets = p.frets.map((f) => (f <= 0 ? f : f + p.baseFret - 1));
      const v = {
        id: `${root}:${suffix}:${frets.join(",")}`,
        root,
        suffix,
        label:
          root +
          (suffix === "major"
            ? ""
            : suffix === "minor"
              ? "m"
              : suffix === "alt"
                ? "(b5)"
                : suffix),
        frets,
        fingers: p.fingers,
        barres: p.barres.map((f) => f + p.baseFret - 1),
      };
      const midi = frets.flatMap((f, i) =>
        f < 0 ? [] : [[40, 45, 50, 55, 59, 64][i] + f],
      );
      if (JSON.stringify(midi) !== JSON.stringify(p.midi))
        throw new Error(`MIDI mismatch ${v.id}`);
      let reason =
        frets.length !== 6 || p.fingers.length !== 6
          ? "Not six strings"
          : frets.some((f) => !Number.isInteger(f) || f < -1 || f > 22)
            ? "Invalid fret"
            : p.fingers.some(
                  (n, i) =>
                    !Number.isInteger(n) ||
                    n < 0 ||
                    n > 4 ||
                    (frets[i] > 0 && n === 0),
                )
              ? "Incomplete or invalid finger assignments"
              : v.barres.some((f) => !frets.includes(f))
                ? "Barre has no matching fretted string"
                : pitchIssue(v);
      if (reason) {
        rejected.push({ id: v.id, reason });
        continue;
      }
      add(v);
      // Closed shapes preserve their fingerings when shifted by octaves.
      for (const delta of [-12, 12])
        if (
          !frets.includes(0) &&
          frets
            .filter((f) => f >= 0)
            .every((f) => f + delta > 0 && f + delta <= 22)
        ) {
          const shifted = frets.map((f) => (f < 0 ? -1 : f + delta));
          add({
            ...v,
            id: `${root}:${suffix}:${shifted.join(",")}`,
            frets: shifted,
            barres: v.barres.map((f) => f + delta),
          });
        }
    }
// Two standard movable barre families fill regional major/minor coverage.
const families = [
  {
    anchor: 4,
    major: [1, 3, 3, 2, 1, 1],
    minor: [1, 3, 3, 1, 1, 1],
    majorF: [1, 3, 4, 2, 1, 1],
    minorF: [1, 3, 4, 1, 1, 1],
  },
  {
    anchor: 9,
    major: [-1, 1, 3, 3, 3, 1],
    minor: [-1, 1, 3, 3, 2, 1],
    majorF: [0, 1, 2, 3, 4, 1],
    minorF: [0, 1, 3, 4, 2, 1],
  },
];
for (const root of canonical)
  for (const suffix of ["major", "minor"])
    for (const family of families)
      for (let base = 1; base <= 20; base++) {
        if ((family.anchor + base) % 12 !== ROOTS[root]) continue;
        const pattern = suffix === "major" ? family.major : family.minor;
        const frets = pattern.map((f) => (f < 0 ? -1 : f + base - 1));
        if (Math.max(...frets) > 22) continue;
        const v = {
          id: `${root}:${suffix}:${frets.join(",")}`,
          root,
          suffix,
          label: root + (suffix === "minor" ? "m" : ""),
          frets,
          fingers: suffix === "major" ? family.majorF : family.minorF,
          barres: [base],
        };
        if (pitchIssue(v)) throw new Error(`Bad movable shape ${v.id}`);
        if (!records.has(v.id))
          corrections.push({
            id: v.id,
            reason:
              "Verified standard movable E/A-family barre shape for neck coverage",
          });
        add(v);
      }
const supplementalInput = readFileSync("vendor/chords/supplemental.json");
const supplemental = JSON.parse(supplementalInput);
const supplementalRecords = [];
for (const seed of supplemental) {
  const definition = EXTENDED.find(d => d.suffix === seed.suffix);
  if (!definition || ROOTS[seed.root] === undefined || !seed.provenance || !seed.review
      || seed.frets.length !== 6 || seed.fingers.length !== 6
      || seed.frets.some((f, i) => !Number.isInteger(f) || (f !== -1 && (f < 1 || f > 22))
        || !Number.isInteger(seed.fingers[i]) || (f < 0 ? seed.fingers[i] !== 0 : seed.fingers[i] < 1 || seed.fingers[i] > 4))
      || seed.barres.some(f => !Number.isInteger(f) || !seed.frets.includes(f)))
    throw new Error(`Invalid supplemental seed ${seed.suffix}`);
  for (const root of canonical) {
    const min = Math.min(...seed.frets.filter(f => f > 0));
    const pitchDelta = (ROOTS[root] - ROOTS[seed.root] + 12) % 12;
    const delta = pitchDelta - (min + pitchDelta > 12 ? 12 : 0);
    for (const shift of [delta, delta + 12]) {
      const frets = seed.frets.map(f => f < 0 ? -1 : f + shift);
      if (frets.some(f => f !== -1 && (f < 1 || f > 22))) continue;
      const v = {
        id: `${root}:${seed.suffix}:${frets.join(",")}`, root,
        suffix: seed.suffix, label: root + definition.display,
        frets, fingers: seed.fingers, barres: seed.barres.map(f => f + shift),
      };
      if (pitchIssue(v)) throw new Error(`Bad supplemental shape ${v.id}: ${pitchIssue(v)}`);
      v.omissions = omissionsFor(v);
      supplementalRecords.push({ id: v.id, seed: supplemental.indexOf(seed) });
      add(v);
    }
  }
}
const catalog = [...records.values()].sort(
  (a, b) =>
    ROOTS[a.root] - ROOTS[b.root] ||
    a.suffix.localeCompare(b.suffix) ||
    Math.min(...a.frets.filter((f) => f > 0)) -
      Math.min(...b.frets.filter((f) => f > 0)),
);
const report = {
  sourceCommit: "df06fa7b425cf5fd29485ff6591236b3557e3fac",
  sha256: createHash("sha256").update(input).digest("hex"),
  supplementalSha256: createHash("sha256").update(supplementalInput).digest("hex"),
  supplementalRecords,
  count: catalog.length,
  rootCounts: {},
  suffixCounts: {},
  regions: {},
  rejected,
  corrections,
};
for (const v of catalog) {
  report.rootCounts[v.root] = (report.rootCounts[v.root] || 0) + 1;
  report.suffixCounts[v.suffix] = (report.suffixCounts[v.suffix] || 0) + 1;
  const n = Math.min(...v.frets.filter((f) => f > 0));
  const region = n < 5 ? "0–4" : n < 10 ? "5–9" : n < 15 ? "10–14" : "15–22";
  report.regions[region] = (report.regions[region] || 0) + 1;
}
writeFileSync("src/chords/voicings.json", JSON.stringify(catalog));
writeFileSync(
  "docs/catalog-coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `${catalog.length} voicings; ${rejected.length} excluded records; ${corrections.length} coverage additions`,
);
