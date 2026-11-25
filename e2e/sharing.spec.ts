import { test, expect } from "@playwright/test";

test("share an unsaved snapshot into a separate library", async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text; } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await page.getByLabel("Song name", { exact: true }).fill("Café 🎸");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
  const link = await page.locator("html").getAttribute("data-copied");
  expect(link).toContain("?song=");
  const recipient = await browser.newContext({ viewport: page.viewportSize() });
  const other = await recipient.newPage();
  await other.goto(link! + "&keep=yes");
  await expect(other.getByLabel("Song name", { exact: true })).toHaveValue("Café 🎸");
  await expect(other.getByText("Shared song — save to keep a copy.")).toBeVisible();
  expect(new URL(other.url()).search).toBe("?keep=yes");
  expect(await other.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBeNull();
  await other.getByRole("button", { name: "All songs", exact: true }).click();
  await expect(other.getByRole("dialog")).toBeVisible();
  await other.getByRole("button", { name: "Cancel", exact: true }).click();
  await other.getByRole("button", { name: "Save", exact: true }).click();
  await expect(other.getByText("Shared song — save to keep a copy.")).toHaveCount(0);
  await other.goto(link!);
  await other.getByRole("button", { name: "Save", exact: true }).click();
  expect(await other.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs.length)).toBe(2);
  const titleBounds = await other.getByLabel("Song name", { exact: true }).boundingBox();
  expect(titleBounds!.width).toBeGreaterThan(200);
  await other.screenshot({ path: `artifacts/share-${test.info().project.name}.png`, fullPage: true });
  expect(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await recipient.close();
});

test("clipboard failure offers a selectable link and invalid links preserve data", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Copy song link" })).toBeVisible();
  await expect(page.getByLabel("Song share link")).toHaveValue(/\?song=/);
  await page.goto("/?song=invalid");
  await expect(page.getByRole("alert")).toContainText("shared song link is invalid");
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
});

test("shared copy waits for storage recovery", async ({ page }) => {
  const payload = btoa(JSON.stringify({ version: 1, name: "After recovery", sections: [] }));
  await page.addInitScript(() => localStorage.setItem("mychords.library.v1", "broken"));
  await page.goto("/?song=" + payload);
  await expect(page.getByText("Let’s keep your ideas safe.")).toBeVisible();
  expect(page.url()).toContain("?song=");
  await page.getByRole("button", { name: "Start fresh" }).click();
  await page.getByRole("button", { name: "Replace with empty library" }).click();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("After recovery");
});
