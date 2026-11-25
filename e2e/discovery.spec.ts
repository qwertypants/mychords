import { activate } from "./activate";
import { test, expect } from "@playwright/test";

test("browse categories, compare inline shapes, and search the whole catalog", async ({ page }, info) => {
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Chord type", { exact: true })).toHaveCount(0);
  await activate(dialog.getByRole("button", { name: "More", exact: true }));
  await activate(dialog.getByRole("button", { name: "Ninths", exact: true }));
  await expect(dialog.getByRole("button", { name: "Ninths", exact: true })).toHaveAttribute("aria-pressed", "true");
  await activate(dialog.getByRole("button", { name: "Major", exact: true }));
  const trigger = dialog.getByRole("button", { name: "Shapes for C", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  const before = await trigger.boundingBox();
  await activate(trigger);
  const panel = dialog.getByRole("region", { name: "Fingerings for C", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("img")).not.toHaveCount(1);
  const after = await trigger.boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(3);
  expect((await panel.boundingBox())!.y).toBeGreaterThan(after!.y);
  await activate(panel.getByRole("button", { name: "Close shapes" }));
  await expect(trigger).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Major", exact: true })).toHaveAttribute("aria-pressed", "true");

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await activate(trigger);
      await panel.scrollIntoViewIfNeeded();
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`discovery-${colorScheme}-${width}.png`) });
      await activate(panel.getByRole("button", { name: "Close shapes" }));
    }
  }
  await dialog.getByLabel("Neck position").selectOption("15");
  await dialog.getByRole("combobox", { name: "Search chords" }).fill("D♭");
  await expect(dialog.getByLabel("Neck position")).toHaveValue("all");
  await expect(dialog.getByRole("button", { name: "Shapes for C#/C", exact: true })).toBeVisible();
  await dialog.getByRole("combobox", { name: "Search chords" }).fill("no-such-chord");
  await activate(dialog.getByRole("button", { name: "Reset filters" }));
  await expect(dialog.locator(".chord-group")).toHaveCount(24);
  await activate(dialog.getByRole("button", { name: "Show more chords" }));
  await expect(dialog.locator(".chord-group")).toHaveCount(48);
});

test("diagram note markers start individual guitar playback", async ({ page }) => {
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));
  const picker = page.getByRole("dialog");
  const note = picker.getByRole("button", { name: "Play C/A D string fret 2", exact: true }).first();
  await expect(note).toBeVisible();
  const request = page.waitForRequest("**/audio/manifest.json");
  await activate(note);
  await request;
  await expect(picker.locator(".picker-playback")).toHaveCount(0);
  await expect(picker.getByRole("button", { name: /Play C\/A low E string/ })).toHaveCount(0);
});

test("search suggests chord names and selection narrows to one chord", async ({ page }) => {
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));
  const picker = page.getByRole("dialog");
  const search = picker.getByRole("combobox", { name: "Search chords" });
  await search.fill("C/A");
  const suggestions = picker.getByRole("listbox", { name: "Chord suggestions" });
  await expect(suggestions.getByText("C/A", { exact: true })).toBeVisible();
  await activate(suggestions.getByText("C/A", { exact: true }));
  await expect(search).toHaveValue("C/A");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(picker.getByRole("button", { name: "Shapes for C/A" })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Shapes for C/Ab" })).toHaveCount(0);
});


test("song card notes play individually without the song toolbar", async ({ page }) => {
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));
  const picker = page.getByRole("dialog");
  await activate(picker.getByRole("button", { name: "Add C/A, -1 0 2 0 1 0", exact: true }));
  await activate(picker.getByRole("button", { name: "Close chord library" }));
  const card = page.locator(".song-chord");
  const request = page.waitForRequest("**/audio/manifest.json");
  await activate(card.getByRole("button", { name: "Play C/A D string fret 2", exact: true }));
  await request;
  await expect(card.getByRole("button", { name: /Play C\/A low E string/ })).toHaveCount(0);
  await expect(page.locator(".song-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop playback" })).toHaveCount(0);
  await expect(card.locator(".hear-chord .lucide-play")).toBeVisible();
});
