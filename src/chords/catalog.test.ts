import { expect, test } from "vitest";
import { catalog, findVoicings } from "./catalog";
test("catalog normalizes open C and eighth-position C", () => {
  const cs = findVoicings({ root: "C", suffix: "major" });
  expect(cs.some((v) => v.frets.join(",") === "-1,3,2,0,1,0")).toBe(true);
  expect(cs.some((v) => v.frets.join(",") === "8,10,10,9,8,8")).toBe(true);
  expect(new Set(catalog.map((v) => v.id)).size).toBe(catalog.length);
});
test("filters include enharmonic roots and neck positions", () => {
  expect(findVoicings({ text: "Db" }).every((v) => v.root === "C#")).toBe(true);
  expect(
    findVoicings({ root: "C", suffix: "minor", minFret: 15 }).length,
  ).toBeGreaterThan(0);
  expect(findVoicings({ text: "not-a-chord" })).toEqual([]);
});
