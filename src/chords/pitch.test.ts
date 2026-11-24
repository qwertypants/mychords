import { expect, test } from "vitest";
import { midiForFrets } from "./pitch";
test("open C preserves register and omits muted bass", () => {
  expect(midiForFrets([-1, 3, 2, 0, 1, 0])).toEqual([48, 52, 55, 60, 64]);
});
test("high C uses its actual guitar pitches", () => {
  expect(midiForFrets([8, 10, 10, 9, 8, 8])).toEqual([48, 55, 60, 64, 67, 72]);
});
test("open strings and duplicate pitches retain their registers", () => {
  expect(midiForFrets([0, 0, 0, 0, 0, 0])).toEqual([40, 45, 50, 55, 59, 64]);
  expect(midiForFrets([5, 0, -1, -1, -1, -1])).toEqual([45, 45]);
});
