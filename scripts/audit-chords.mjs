import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { pitchIssue } from "./chord-rules.mjs";
const catalog = JSON.parse(readFileSync("src/chords/voicings.json"));
const report = JSON.parse(readFileSync("docs/catalog-coverage.json"));
const reviewed = JSON.parse(
  readFileSync("vendor/chords/reviewed-rejections.json"),
);
assert.deepEqual(report.rejected, reviewed, "New exclusions require review");
assert.equal(new Set(catalog.map((v) => v.id)).size, catalog.length);
for (const v of catalog) {
  assert.equal(v.frets.length, 6);
  assert.equal(v.fingers.length, 6);
  assert(
    v.frets.every(
      (f, i) =>
        Number.isInteger(f) &&
        f >= -1 &&
        f <= 22 &&
        Number.isInteger(v.fingers[i]) &&
        v.fingers[i] >= 0 &&
        v.fingers[i] <= 4 &&
        (f <= 0 || v.fingers[i] > 0),
    ),
    v.id,
  );
  assert.equal(pitchIssue(v), null, v.id);
}
for (const root of Object.keys(report.rootCounts))
  for (const suffix of ["major", "minor"])
    for (const [lo, hi] of [
      [0, 4],
      [5, 14],
      [15, 22],
    ])
      assert(
        catalog.some(
          (v) =>
            v.root === root &&
            v.suffix === suffix &&
            Math.min(...v.frets.filter((f) => f > 0)) >= lo &&
            Math.min(...v.frets.filter((f) => f > 0)) <= hi,
        ),
        `${root} ${suffix} missing region ${lo}–${hi}`,
      );
console.log(
  `Audited ${catalog.length} voicings, ${Object.keys(report.rootCounts).length} roots, ${Object.keys(report.suffixCounts).length} suffixes; ${reviewed.length} documented source exclusions.`,
);

// Supplemental shapes have a separate contract; upstream exclusions stay unchanged.
const { EXTENDED, extendedPitches, omissionsFor } = await import("./chord-rules.mjs");
const { createHash } = await import("node:crypto");
const legacy = catalog.filter(v => !EXTENDED.some(d => d.suffix === v.suffix));
assert.equal(createHash("sha256").update(JSON.stringify(legacy)).digest("hex"), "13251ebb2521da8c2bfb1a686ef6668034e3d79940497ccabb61544275c75eb5", "Existing voicings changed; review compatibility before updating this fingerprint");
assert.equal(Object.keys(report.rootCounts).length, 12);
const { get, add } = await import("@tonaljs/chord-type");
const { semitones } = await import("@tonaljs/interval");
const bases = { m13: "m11", m11add13: "m11", "7add13": "7", maj7add13: "maj7", m7add13: "m7", add13: "major", madd11: "minor", madd13: "minor" };
for (const d of EXTENDED) {
  const added = d.suffix === "madd11" ? "11P" : "13M";
  const expected = [...get(bases[d.suffix]).intervals, added].map(i => semitones(i) % 12).sort((a, b) => a - b);
  assert.deepEqual(extendedPitches(d).sort((a, b) => a - b), expected, d.suffix);
  add(d.intervals, [`mychords:${d.suffix}`], d.name);
  assert.deepEqual(get(`mychords:${d.suffix}`).intervals, d.intervals);
  for (const root of Object.keys(report.rootCounts)) {
    const shapes = catalog.filter(v => v.root === root && v.suffix === d.suffix);
    assert(new Set(shapes.map(v => Math.min(...v.frets.filter(f => f > 0)))).size >= 2, `${root}${d.suffix} needs two positions`);
    for (const v of shapes) {
      assert.deepEqual(v.omissions, omissionsFor(v), v.id);
      assert(Math.max(...v.frets) - Math.min(...v.frets.filter(f => f > 0)) <= 2, v.id);
      const sounding = v.frets.flatMap((f, i) => f > 0 ? [i] : []);
      assert.equal(sounding.length, 4, v.id);
      assert.equal(sounding.at(-1) - sounding[0], 3, `Nonadjacent grip: ${v.id}`);
      for (const a of sounding) for (const b of sounding) {
        if (v.frets[a] < v.frets[b]) assert(v.fingers[a] < v.fingers[b], `Reversed finger order: ${v.id}`);
      }
      for (let finger = 1; finger <= 4; finger++) {
        const strings = v.fingers.flatMap((f, i) => f === finger ? [i] : []);
        if (strings.length < 2) continue;
        const fret = v.frets[strings[0]];
        assert(strings.every(i => v.frets[i] === fret), `Finger at multiple frets: ${v.id}`);
        assert(v.barres.includes(fret), `Undeclared barre: ${v.id}`);
        assert(v.frets.slice(strings[0], strings.at(-1) + 1).every(f => f >= fret), `Barre blocks lower note: ${v.id}`);
      }
    }
  }
}
const strictB = { root: "B", suffix: "m11add13", frets: [-1, -1, 2, 2, 3, 4] };
assert.equal(pitchIssue(strictB), null);
assert.equal(pitchIssue({ ...strictB, frets: [-1, -1, -1, 2, 3, 4] }), "Missing a defining chord tone");
assert.equal(pitchIssue({ ...strictB, frets: [-1, -1, 2, 2, 3, -1] }), "Missing a defining chord tone");
assert.equal(pitchIssue({ ...strictB, frets: [-1, -1, 2, 2, 3, 3] }), "Contains a pitch outside the named chord");
console.log("Verified extended formulas with Tonal, required colors, omissions, coverage, and finger/barre geometry.");
