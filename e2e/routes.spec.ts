import { test, expect } from "@playwright/test";

test("songs use stable ID routes across reload and browser history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await page.getByLabel("Song name", { exact: true }).fill("First idea");
  const first = new URL(page.url()).pathname;
  expect(first).toMatch(/^\/songs\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "All songs", exact: true }).click();
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const second = new URL(page.url()).pathname;
  expect(second).not.toBe(first);
  await page.getByRole("button", { name: "All songs", exact: true }).click();
  await page.getByRole("button", { name: "Open First idea" }).click();
  expect(new URL(page.url()).pathname).toBe(first);
  await page.reload();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("First idea");
  await page.goBack();
  await expect(page.getByRole("button", { name: "Open First idea" })).toBeVisible();
  await page.goForward();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("First idea");
  await page.getByLabel("Song name", { exact: true }).fill("Renamed idea");
  expect(new URL(page.url()).pathname).toBe(first);
  await page.goto(first);
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Renamed idea");
});

test("unknown local song IDs show a way back", async ({ page }) => {
  await page.goto("/songs/missing-id");
  await expect(page.getByRole("heading", { name: "Song not found" })).toBeVisible();
  await page.getByRole("button", { name: "All songs" }).click();
  expect(new URL(page.url()).pathname).toBe("/");
});

test("browser Back protects an edit that failed to save", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const songPath = new URL(page.url()).pathname;
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new Error("Full"); };
  });
  await page.getByLabel("Song name", { exact: true }).fill("Unsaved idea");
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await page.goBack();
  await expect(page.getByRole("dialog", { name: "Keep your changes?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(new URL(page.url()).pathname).toBe(songPath);
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Unsaved idea");
  await page.evaluate(() => (window as typeof window & { restoreStorage?: () => void }).restoreStorage?.());
  await page.goBack();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Open Unsaved idea" })).toBeVisible();
});
