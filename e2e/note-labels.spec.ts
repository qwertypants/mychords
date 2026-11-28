import { expect, test } from "@playwright/test";
import { activate, expandFilters } from "./activate";

test("note labels follow the fingering everywhere a chord chart appears", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => {
      document.documentElement.dataset.copied = text;
    } } });
  });
  await page.goto("/");
  await expect(page.getByRole("note", { name: "Fretboard legend" })).toHaveCount(1);
  await expect(page.locator(".hero-chord .chord-tone-key")).toHaveCount(0);
  await expect(page.locator(".degree-label")).toHaveCount(0);
  await expect(page.locator(".hero-chord").nth(0).locator(".string-letter")).toHaveText(["", "C", "E", "G", "C", "E"]);
  await expect(page.locator(".hero-chord").nth(1).locator(".string-letter")).toHaveText(["", "A", "E", "A", "C", "E"]);
  await expect(page.locator(".hero-chord").nth(2).locator(".string-letter")).toHaveText(["G", "B", "D", "G", "B", "G"]);

  await activate(page.getByRole("button", { name: "New song", exact: true }).first());
  await page.getByLabel("Song name", { exact: true }).fill("Note labels");
  await activate(page.getByRole("button", { name: "Add chord", exact: true }).first());
  await expect(page.getByRole("dialog").locator(".chord-tone-key")).toHaveCount(0);
  await expect(page.locator(".voicing-card .chord-tone-key")).toHaveCount(0);
  await expandFilters(page);
  await activate(page.getByRole("button", { name: "Major", exact: true }));
  await expect(page.locator(".chord-group [data-voicing='C:major:-1,3,2,0,1,0'] .string-letter")).toHaveText(["", "C", "E", "G", "C", "E"]);
  await activate(page.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ }));
  const high = page.getByRole("region", { name: "Fingerings for C", exact: true }).locator("[data-voicing='C:major:8,10,10,9,8,8']");
  await expect(high.locator(".string-letter")).toHaveText(["C", "G", "C", "E", "G", "C"]);
  await expect(high.locator('.tone-note').first()).toHaveCSS("fill", "rgb(183, 45, 59)");
  await activate(high.getByRole("button", { name: /^Add C,/ }));
  await activate(page.getByRole("button", { name: "Close shapes" }));
  await activate(page.getByRole("button", { name: "Close chord library" }));
  const labels = page.locator(".song-chord .string-letter");
  await expect(page.getByRole("note", { name: "Fretboard legend" })).toHaveCount(1);
  await expect(page.locator(".song-chord .chord-tone-key")).toHaveCount(0);
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
  for (const label of await labels.all()) await expect(label).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Note labels");
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
  await activate(page.getByRole("button", { name: "Share", exact: true }));
  await expect(page.locator("html")).toHaveAttribute("data-copied", /\?song=/);
  const link = await page.locator("html").getAttribute("data-copied");
  await page.goto(link!);
  await activate(page.getByRole("button", { name: "Continue in browser" }));
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
});

for (const theme of ["light", "dark"] as const) {
  test(`the text-only legend fits directly beneath the app title in ${theme} mode`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      const key = page.getByRole("note", { name: "Fretboard legend" });
      await expect(key.locator("span")).toHaveText(["Root", "Third", "Fifth"]);
      await expect(page.locator(".chord-tone-key")).toHaveCount(1);
      await expect(key).toHaveCSS("font-size", "12px");
      const title = await page.locator(".brand > span").last().boundingBox();
      const legend = await key.boundingBox();
      expect(Math.abs(legend!.x - title!.x)).toBeLessThan(1);
      expect(legend!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
      expect(legend!.x + legend!.width).toBeLessThanOrEqual(title!.x + title!.width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator(".app-header").screenshot({ path: testInfo.outputPath(`legend-${theme}-${width}.png`) });
    }
  });

  test(`colored notes and guides remain readable in ${theme} mode`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/");
    const chart = page.locator(".hero-chord").first();
    await expect(chart.locator('[data-tone="root"] .tone-note').first()).toHaveCSS("fill", theme === "light" ? "rgb(183, 45, 59)" : "rgb(255, 140, 152)");
    await expect(chart.locator('[data-tone="third"] .tone-note').first()).toHaveCSS("fill", theme === "light" ? "rgb(33, 115, 63)" : "rgb(125, 213, 160)");
    await expect(chart.locator('[data-tone="fifth"] .tone-note').first()).toHaveCSS("fill", theme === "light" ? "rgb(36, 87, 198)" : "rgb(145, 183, 255)");
    await expect(chart.locator('.tone-guide[data-string="0"][data-fret="0"] circle')).toHaveCSS("fill-opacity", "0.3");
    await expect(chart.locator('.tone-guide[data-string="0"][data-fret="3"] circle')).toHaveCSS("stroke-opacity", "0.6");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.hero-chords').screenshot({ path: testInfo.outputPath(`chord-colors-${theme}.png`) });
  });
}
