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

test("play all sequences repeated chords across sections and supports stop and replay", async ({ page }) => {
  await page.addInitScript(() => {
    window.strumStarts = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      start.apply(this, args);
      window.strumStarts.push(args[0] ?? 0);
    };
    const chord = (id: string) => ({ id, voicingId: "C:major:-1,3,2,0,1,0" });
    localStorage.setItem("mychords.library.v1", JSON.stringify({
      version: 1,
      songs: [{ id: "sequence", name: "Sequence", updatedAt: "2026-11-27T12:00:00.000Z",
        sections: [
          { id: "verse", name: "Verse", chords: [chord("first")] },
          ...Array.from({ length: 8 }, (_, i) => ({ id: `empty-${i}`, name: `Empty ${i}`, chords: [] })),
          { id: "chorus", name: "Chorus", chords: [chord("second"), chord("third")] },
        ],
      }],
    }));
  });
  await page.goto("/songs/sequence");
  const toolbar = page.locator(".song-speed-sticky");
  const play = toolbar.getByRole("button", { name: "Play all chords", exact: true });
  await expect(play).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(toolbar).toHaveClass(/is-stuck/);
  await expect(play).toBeInViewport();
  await expect(play.locator("span")).toBeHidden();
  await toolbar.getByRole("radio", { name: "Together", exact: true }).check();
  await play.click();
  const stop = toolbar.getByRole("button", { name: "Stop song", exact: true });
  await expect(stop).toBeVisible();
  await expect(page.locator('[data-entry-id="first"]')).toHaveClass(/is-playing/);
  await expect.poll(() => page.evaluate(() => {
    const first = window.strumStarts[0];
    return window.strumStarts.map(at => Math.round((at - first) * 1000));
  })).toEqual([0, 0, 0, 0, 0, 1800, 1800, 1800, 1800, 1800, 3600, 3600, 3600, 3600, 3600]);
  await stop.click();
  await expect(play).toBeVisible();
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(0);
  await play.click();
  for (const id of ["first", "second", "third"]) {
    await expect(page.locator(`[data-entry-id="${id}"]`)).toHaveClass(/is-playing/);
  }
  await expect(play).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(0);

  await play.click();
  await page.getByRole("button", { name: "Play section Chorus", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop section Chorus", exact: true })).toBeVisible();
  await expect(play).toBeVisible();
  await page.getByRole("button", { name: "Stop section Chorus", exact: true }).click();
});

test("play all is disabled for a song without chords", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Play all chords", exact: true })).toBeDisabled();
});
