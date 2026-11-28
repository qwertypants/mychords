import { expect, test } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`sticky speed in ${colorScheme}`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    test("speed remains selectable while scrolling without moving the chords", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("mychords.library.v1", JSON.stringify({
          version: 1,
          songs: [{
            id: "sticky-test", name: "Long song", updatedAt: "2026-11-27T12:00:00.000Z",
            sections: Array.from({ length: 4 }, (_, section) => ({
              id: `section-${section}`, name: `Part ${section + 1}`,
              chords: Array.from({ length: 8 }, (_, chord) => ({
                id: `chord-${section}-${chord}`, voicingId: "C:major:-1,3,2,0,1,0",
              })),
            })),
          }],
        }));
      });
      await page.goto("/songs/sticky-test");
      await page.evaluate(() => document.fonts.ready);
      const sticky = page.locator(".song-speed-sticky");
      const speed = sticky.getByRole("group", { name: "Strum speed" });
      const normal = speed.getByRole("radio", { name: "Normal", exact: true });
      await expect(normal).toBeChecked();
      await expect(speed.locator(".strum-speed-label").first()).toBeVisible();
      const chordTop = () => page.locator(".song-chord").first().evaluate(
        node => node.getBoundingClientRect().top + window.scrollY,
      );
      const originalTop = await chordTop();

      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, 600));
        await expect(sticky).toHaveClass(/is-stuck/);
        await expect(speed).toBeInViewport();
        await expect(speed.locator(".strum-speed-label").first()).toBeHidden();
        await expect(speed.locator(".strum-speed-icon").first()).toBeVisible();
        expect(await chordTop()).toBeCloseTo(originalTop, 1);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(sticky).not.toHaveClass(/is-stuck/);
        await expect(speed.locator(".strum-speed-label").first()).toBeVisible();
      }

      await page.evaluate(() => window.scrollTo(0, 900));
      await expect(sticky).toHaveClass(/is-stuck/);
      for (const name of ["Slow", "Normal", "Together"]) {
        const radio = speed.getByRole("radio", { name, exact: true });
        await radio.check();
        await expect(radio).toBeChecked();
        const box = await radio.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      await normal.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(speed.getByRole("radio", { name: "Slow", exact: true })).toBeChecked();
      await expect(speed.getByRole("radio", { name: "Slow", exact: true })).toBeFocused();

      await page.setViewportSize({ width: 320, height: 740 });
      await expect(sticky).toHaveClass(/is-stuck/);
      await expect(speed).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator(".song-section").last().scrollIntoViewIfNeeded();
      await expect(speed).toBeInViewport();
      const add = page.locator(".song-section").last().getByRole("button", { name: "Add chord", exact: true });
      await add.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close chord library" }).click();
      await expect(add).toBeFocused();
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(sticky).not.toHaveClass(/is-stuck/);
      await expect(speed.getByRole("radio", { name: "Slow", exact: true })).toBeChecked();
      await page.reload();
      await expect(speed.getByRole("radio", { name: "Slow", exact: true })).toBeChecked();
    });
  });
}
