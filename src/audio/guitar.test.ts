import { expect, test } from "vitest";
import { planStrums, nearestSample } from "./guitar";
import { findVoicings } from "../chords/catalog";
const c = findVoicings({ root: "C", suffix: "major" }).find(
  (v) => v.frets.join(",") === "-1,3,2,0,1,0",
);
if (!c) throw new Error("Missing fixture");
test("strums exact sounding strings at simple fixed preview spacing", () => {
  const events = planStrums([
    { entryId: "one", voicing: c },
    { entryId: "two", voicing: c },
  ]);
  expect(events.slice(0, 5).map((e) => e.midi)).toEqual([48, 52, 55, 60, 64]);
  expect(events.slice(0, 5).map((e) => e.at)).toEqual([
    0, 0.025, 0.05, 0.07500000000000001, 0.1,
  ]);
  expect(events[5].at).toBe(1.8);
  expect(events[5].entryId).toBe("two");
  expect(planStrums([])).toEqual([]);
});
test("nearest sample is selected without rounding away semitones", () => {
  expect(nearestSample(48, [40, 45, 50, 55])).toBe(50);
  expect(nearestSample(42, [40, 44])).toBe(40);
});

test.each([
  ["slow", [0, 100, 200, 300, 400]],
  ["normal", [0, 25, 50, 75, 100]],
  ["together", [0, 0, 0, 0, 0]],
] as const)("%s keeps the same pitches and chord starts", (speed, offsets) => {
  const events = planStrums([
    { entryId: "first", voicing: c },
    { entryId: "second", voicing: c },
  ], speed);
  expect(events.slice(0, 5).map(({ midi }) => midi)).toEqual([48, 52, 55, 60, 64]);
  expect(events.map(({ at }) => Math.round(at * 1000))).toEqual([
    ...offsets,
    ...offsets.map((offset) => 1800 + offset),
  ]);
  expect(planStrums([{ entryId: "note", voicing: c, stringIndex: 5 }], speed))
    .toEqual([{ entryId: "note", midi: 64, at: 0 }]);
});

test("a clicked string plays only its exact pitch, while muted strings stay silent", () => {
  expect(planStrums([{ entryId: "note", voicing: c, stringIndex: 1 }])).toEqual([{ entryId: "note", midi: 48, at: 0 }]);
  expect(planStrums([{ entryId: "open", voicing: c, stringIndex: 5 }])).toEqual([{ entryId: "open", midi: 64, at: 0 }]);
  expect(planStrums([{ entryId: "muted", voicing: c, stringIndex: 0 }])).toEqual([]);
});
