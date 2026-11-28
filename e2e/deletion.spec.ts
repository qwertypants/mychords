import { test, expect } from "@playwright/test";
import { expandFilters } from "./activate";

test("chords and empty or populated sections require confirmation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await page.getByLabel("Song name", { exact: true }).fill("Deletion checks");
  await page.getByRole("button", { name: "Add chord", exact: true }).click();
  await expandFilters(page);
  await page.getByRole("button", { name: "Major", exact: true }).click();
  const add = page.getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true });
  await add.click();
  await add.click();
  await page.getByRole("button", { name: "Close chord library" }).click();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page.reload();
  const original = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
  const remove = page.getByRole("button", { name: "Remove C, position 2", exact: true });
  const dialog = page.getByRole("dialog");
  await remove.click();
  await expect(dialog).toContainText("C at position 2 in Verse");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.screenshot({ path: `artifacts/delete-chord-${test.info().project.name}.png`, fullPage: true });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(original);
  await remove.click();
  await dialog.getByRole("button", { name: "Remove chord", exact: true }).click();
  await expect(page.locator("[data-entry-id]")).toHaveCount(1);
  await expect(page.locator("#main-content")).toBeFocused();
  await page.reload();
  await expect(page.locator("[data-entry-id]")).toHaveCount(1);

  for (const name of ["Section 2", "Verse"]) {
    const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
    const removeSection = page.getByRole("button", { name: `Remove section ${name}`, exact: true });
    await removeSection.click();
    await expect(dialog).toHaveAccessibleName("Remove this section?");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(removeSection).toBeFocused();
    await removeSection.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
    await removeSection.click();
    await dialog.getByRole("button", { name: "Remove section", exact: true }).click();
    await page.reload();
    await expect(removeSection).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

for (const from of ["editor", "list"]) {
  test(`song deletion from ${from} still requires confirmation`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New song", exact: true }).first().click();
    await page.getByLabel("Song name", { exact: true }).fill("Keep until confirmed");
    if (from === "list") await page.getByRole("button", { name: "All songs", exact: true }).click();
    const remove = page.getByRole("button", { name: from === "editor" ? "Delete song" : "Delete Keep until confirmed", exact: true });
    const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
    await remove.click();
    const dialog = page.getByRole("dialog", { name: "Delete this song?" });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await remove.click();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
    await remove.click();
    await dialog.getByRole("button", { name: "Delete song", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Open Keep until confirmed" })).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs)).toEqual([]);
  });
}

test("replacing the stored library still requires confirmation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mychords.library.v1", "broken"));
  await page.reload();
  const startFresh = page.getByRole("button", { name: "Start fresh" });
  await startFresh.click();
  const dialog = page.getByRole("dialog", { name: "Replace the stored library?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await startFresh.click();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe("broken");
  await startFresh.click();
  await dialog.getByRole("button", { name: "Replace with empty library" }).click();
  await expect(startFresh).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!))).toEqual({ version: 1, songs: [] });
});
