import { activate, expandFilters } from "./activate";
import { test, expect } from "@playwright/test";

test("playing and replaying voicings highlights only the triggering card", async ({ page }) => {
  await page.goto("/");
  const libraryCard = page.getByRole("button", { name: "Hear C", exact: true });
  await activate(libraryCard);
  await expect(libraryCard).toHaveClass(/is-playing/);
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));

  const picker = page.getByRole("dialog");
  await expect(picker.locator(".is-playing")).toHaveCount(0);
  await expandFilters(page);
  await activate(picker.getByRole("button", { name: "Major", exact: true }));
  await activate(picker.getByRole("button", { name: "Shapes for C", exact: true }));
  const openCard = picker.locator(".shape-panel").locator('[data-voicing="C:major:-1,3,2,0,1,0"]');
  const hearOpen = openCard.getByRole("button", { name: /^Hear / });
  const hearHigh = picker.getByRole("button", { name: "Hear C, 8 10 10 9 8 8", exact: true });
  await hearHigh.press("Enter");
  await hearOpen.press("Enter");
  await expect(picker.locator(".is-playing")).toHaveCount(1);
  await expect(openCard).toHaveClass(/is-playing/);
  await expect(page.locator(".hero-chord.is-playing")).toHaveCount(0);

  const replay = await openCard.evaluateHandle((card) => {
    const states: boolean[] = [];
    const observer = new MutationObserver(() => {
      states.push(card.classList.contains("is-playing"));
    });
    observer.observe(card, { attributes: true, attributeFilter: ["class"] });
    return { states, observer };
  });
  await hearOpen.press("Enter");
  await expect.poll(() => replay.evaluate(({ states }) => states)).toEqual([false, true]);
  await replay.evaluate(({ observer }) => observer.disconnect());
  await replay.dispose();

  await expect(picker.locator(".picker-playback")).toHaveCount(0);
  await picker.getByRole("button", { name: "Close chord library" }).press("Enter");
  await expect(page.locator(".voicing-card.is-playing")).toHaveCount(0);
});

test("the picker stays interactive during motion and confirms each successful edit", async ({ page }, testInfo) => {
  const start = new Date("2026-01-01T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().press("Enter");

  const open = page.getByRole("button", { name: "Add chord", exact: true });
  await open.press("Enter");
  const picker = page.getByRole("dialog");
  const search = picker.getByRole("combobox", { name: "Search chords" });
  await search.focus();
  await expect(search).toBeFocused();
  await page.clock.runFor(64);
  const drawerEdge = picker.locator(".picker-motion-edge");
  await expect(drawerEdge).not.toHaveCSS("opacity", "0");
  await page.keyboard.type("Cm");
  await expect(search).toHaveValue("Cm");
  await page.keyboard.press("Tab");
  await page.clock.runFor(1);
  await expect(search).not.toBeFocused();
  await expect(picker.locator(":focus")).toHaveCount(1);
  if (testInfo.project.use.hasTouch) {
    const root = picker.getByRole("button", { name: "G", exact: true });
    await root.focus();
    const bounds = await root.boundingBox();
    if (!bounds) throw new Error("Missing root filter");
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await expect(root).toHaveAttribute("aria-pressed", "true");
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(drawerEdge).toHaveCSS("opacity", "0");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.press("Enter");
  await search.focus();
  await expect(search).toBeFocused();
  await page.clock.runFor(64);
  await expect(drawerEdge).toHaveCSS("opacity", "0");

  await expandFilters(page);
  await picker.getByRole("button", { name: "Major", exact: true }).press("Enter");
  const add = picker.getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true });
  const addEdge = picker.locator(".voicing-add-edge > span").first();
  await add.press("Enter");
  await expect(add.locator("svg.lucide-check")).toBeVisible();
  await expect(addEdge).toHaveCSS("opacity", "0");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await add.press("Enter");
  await page.clock.runFor(64);
  await expect(add.locator("svg.lucide-check")).toBeVisible();
  await expect(addEdge).not.toHaveCSS("opacity", "0");
  await page.clock.runFor(320);
  await expect(addEdge).toHaveCSS("opacity", "0");
  await add.press("Enter");
  await page.clock.runFor(64);
  await expect(addEdge).not.toHaveCSS("opacity", "0");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-entry-id]")).toHaveCount(3);

  const save = page.getByRole("button", { name: "Save", exact: true });
  const icon = save.locator("svg");
  await save.press("Enter");
  await page.clock.runFor(64);
  await expect(icon).not.toHaveCSS("transform", "none");
  await expect(page.locator(".song-toolbar")).toHaveCount(0);

  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByLabel("Song name", { exact: true }).fill("Keep this draft");
  await save.press("Enter");
  await expect(icon).toHaveCSS("transform", "none");
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Keep this draft");
});
