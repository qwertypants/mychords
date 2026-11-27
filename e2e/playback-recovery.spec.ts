import { expect, test } from "@playwright/test";
import { activate } from "./activate";

test("Android creates fresh Web Audio after returning to the app", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    let contexts = 0;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        document.documentElement.dataset.audioContexts = String(++contexts);
      }
    };
  });
  await page.goto("/");
  const hear = page.getByRole("button", { name: "Hear C", exact: true });
  await activate(hear);
  await expect(page.getByText("Acoustic preview", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-audio-contexts", "1");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
  await activate(hear);
  await expect(page.getByText("Acoustic preview", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-audio-contexts", "2");
});

test("installed iPhone uses media playback after returning to the app", async ({ page }, info) => {
  test.skip(info.project.name !== "webkit-mobile");
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    const NativeAudio = window.Audio;
    window.Audio = function (src?: string) {
      document.documentElement.dataset.mediaCreates = String(Number(document.documentElement.dataset.mediaCreates || 0) + 1);
      return new NativeAudio(src);
    } as typeof Audio;
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      document.documentElement.dataset.mediaPlays = String(Number(document.documentElement.dataset.mediaPlays || 0) + 1);
      return nativePlay.call(this);
    };
  });
  await page.goto("/");
  const hear = page.getByRole("button", { name: "Hear C", exact: true });
  await activate(hear);
  await expect(page.locator("html")).toHaveAttribute("data-media-plays", /[1-9]/);
  await expect(page.getByText("Acoustic preview", { exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  const created = await page.locator("html").getAttribute("data-media-creates");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
  await activate(hear);
  await expect(page.getByText("Acoustic preview", { exact: true })).toBeVisible();
  await page.waitForTimeout(200);
  await expect(page.locator("html")).toHaveAttribute("data-media-creates", created!);
});
