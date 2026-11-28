import { test, expect } from "@playwright/test";
import { activate } from "./activate";

const selected = "B:m11add13:-1,-1,2,2,3,4";
test("extended shapes retain their exact pitches through preview, save and share", async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text; } } });
  });
  await page.goto("/");
  await activate(page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first());
  await page.getByLabel("Song name", { exact: true }).fill("Extended colors");
  await activate(page.getByRole("button", { name: "Add chord", exact: true }).first());
  const search = page.getByRole("combobox", { name: "Search chords" });
  await search.fill("Bm11 add 13");
  await search.press("Enter");
  const card = page.locator(`.grouped-chords > .chord-group > [data-voicing="${selected}"]`);
  // The lowest-position grip is the preview; all alternative fingerings stay selectable.
  await expect(card).toBeVisible();
  await expect(card).toContainText("Omits root, fifth, ninth");
  await expect(card.getByRole("group")).toHaveAttribute("aria-label", /Omits root, fifth, ninth/);
  await activate(card.getByRole("button", { name: "Hear Bm11 add13, -1 -1 2 2 3 4", exact: true }));
  await expect(card).toHaveClass(/is-playing/);
  await activate(page.getByRole("button", { name: /^Shapes for Bm11 add13,/ }));
  const fan = page.locator(".shape-fan-canvas");
  expect(await fan.locator(".voicing-card").count()).toBeGreaterThan(1);
  await expect(fan.getByRole("button", { name: "Play Bm11 add13 high E string fret 4, Ab" })).toBeVisible();
  await activate(fan.getByRole("button", { name: "Close shapes" }));
  await expect(fan).toHaveCount(0);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(card).toBeVisible();
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`extended-picker-${width}.png`), fullPage: true });
  }
  await activate(card.getByRole("button", { name: "Add Bm11 add13, -1 -1 2 2 3 4", exact: true }));
  await activate(page.getByRole("button", { name: "Close chord library" }));
  await expect(page.locator(`[data-entry-id][data-voicing="${selected}"]`)).toHaveCount(1);
  await page.reload();
  await expect(page.locator(`[data-entry-id][data-voicing="${selected}"]`)).toHaveCount(1);
  await activate(page.getByRole("button", { name: "Share", exact: true }));
  await expect(page.getByRole("tooltip")).toHaveText("Copied");
  const link = await page.locator("html").getAttribute("data-copied");
  if (!link) throw new Error("Missing shared link");
  const recipient = await browser.newContext();
  const other = await recipient.newPage();
  await other.goto(link);
  await other.getByRole("button", { name: "Continue in browser" }).click();
  await expect(other.locator(`[data-entry-id][data-voicing="${selected}"]`)).toHaveCount(1);
  await recipient.close();
  expect(errors).toEqual([]);
});
