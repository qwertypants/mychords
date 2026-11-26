import { expect, test } from "@playwright/test";
import { activate, expandFilters } from "./activate";

declare global {
  interface Window {
    strumStarts: number[];
  }
}

test("one strum speed applies to previews and sections and survives reload", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.strumStarts = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      start.apply(this, args);
      window.strumStarts.push(args[0] ?? 0);
    };
  });
  if (testInfo.project.use.hasTouch) await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const speed = page.getByRole("group", { name: "Strum speed" });
  const hear = page.getByRole("button", { name: "Hear C", exact: true });
  const offsets = () => page.evaluate(() =>
    window.strumStarts.map((at) => Math.round((at - window.strumStarts[0]) * 1000)),
  );
  const clearStarts = () => page.evaluate(() => { window.strumStarts.length = 0; });

  await expect(speed.getByRole("radio", { name: "Normal" })).toBeChecked();
  await expect(speed.getByRole("radio")).toHaveCount(3);
  await speed.scrollIntoViewIfNeeded();
  await expect(speed).toBeInViewport({ ratio: 0.99 });
  await activate(hear);
  await expect.poll(offsets).toEqual([0, 25, 50, 75, 100]);

  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "Hear G", exact: true }).press("Tab");
    await expect(speed.getByRole("radio", { name: "Normal" })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(speed.getByRole("radio", { name: "Slow" })).toBeChecked();
  } else {
    await speed.getByRole("radio", { name: "Slow" }).check();
  }
  await clearStarts();
  await activate(hear);
  await expect.poll(offsets).toEqual([0, 100, 200, 300, 400]);

  await page.getByRole("button", { name: "New song", exact: true }).first().press("Enter");
  await expect(speed.getByRole("radio", { name: "Slow" })).toBeChecked();
  await page.getByRole("button", { name: "Add chord", exact: true }).press("Enter");
  const picker = page.getByRole("dialog");
  await expandFilters(page);
  const pickerSpeed = picker.getByRole("group", { name: "Strum speed" });
  await expect(pickerSpeed.getByRole("radio", { name: "Slow" })).toBeChecked();
  await pickerSpeed.scrollIntoViewIfNeeded();
  await expect(pickerSpeed).toBeInViewport();
  await pickerSpeed.getByRole("radio", { name: "Together" }).check();
  await expandFilters(page);
  await picker.getByRole("button", { name: "Major", exact: true }).press("Enter");
  await clearStarts();
  await picker.getByRole("button", { name: "Hear C, -1 3 2 0 1 0", exact: true }).press("Enter");
  await expect.poll(offsets).toEqual([0, 0, 0, 0, 0]);
  const add = picker.getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true });
  await add.press("Enter");
  await add.press("Enter");
  await picker.getByRole("button", { name: "Close chord library" }).press("Enter");

  await expect(speed.getByRole("radio", { name: "Together" })).toBeChecked();
  await clearStarts();
  await activate(page.getByRole("button", { name: "Play section Verse", exact: true }));
  await expect.poll(offsets).toEqual([0, 0, 0, 0, 0, 1800, 1800, 1800, 1800, 1800]);
  await page.reload();
  await expect(speed.getByRole("radio", { name: "Together" })).toBeChecked();
});

test("diagram pulses use the speed captured for the current preview", async ({ page }) => {
  const start = new Date("2026-01-01T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/");
  const speed = page.getByRole("group", { name: "Strum speed" });
  const hear = page.getByRole("button", { name: "Hear C", exact: true });
  const rings = hear.locator(".strum-ring");
  const visibleRings = () => rings.evaluateAll((markers) =>
    markers.filter((marker) => Number(getComputedStyle(marker).opacity) > 0).length,
  );
  const preview = async () => {
    await hear.press("Enter");
    await expect(page.getByText("Loading acoustic guitar…")).toBeVisible();
    await expect.poll(async () => {
      await page.clock.runFor(20);
      return hear.evaluate((card) => card.classList.contains("is-playing"));
    }).toBe(true);
  };

  await speed.getByRole("radio", { name: "Slow" }).check();
  await preview();
  await page.clock.runFor(30);
  expect(await visibleRings()).toBe(1);
  await speed.getByRole("radio", { name: "Together" }).check();
  await page.clock.runFor(100);
  expect(await visibleRings()).toBe(2);
  await page.getByRole("button", { name: "Stop playback" }).press("Enter");
  expect(await visibleRings()).toBe(0);

  await preview();
  await page.clock.runFor(30);
  expect(await visibleRings()).toBe(5);
});

test("invalid or unavailable storage leaves the speed control usable", async ({ page }) => {
  await page.goto("/");
  const speed = page.getByRole("group", { name: "Strum speed" });
  await page.evaluate(() => localStorage.setItem("mychords.strumSpeed", "constructor"));
  await page.reload();
  await expect(speed.getByRole("radio", { name: "Normal" })).toBeChecked();

  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "mychords.strumSpeed") throw new Error("Preference read blocked");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "mychords.strumSpeed") throw new Error("Preference write blocked");
      setItem.call(this, key, value);
    };
  });
  await page.reload();
  await expect(speed.getByRole("radio", { name: "Normal" })).toBeChecked();
  await speed.getByRole("radio", { name: "Slow" }).check();
  await page.getByRole("button", { name: "Explore chords", exact: true }).press("Enter");
  await expandFilters(page);
  await expect(page.getByRole("dialog").getByRole("group", { name: "Strum speed" }).getByRole("radio", { name: "Slow" })).toBeChecked();
});
