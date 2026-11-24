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
