import { expect, test } from "@playwright/test";
import { activate } from "./activate";

test("backgrounding stops playback and the next tap reuses the Web Audio player", async ({ page }, info) => {
  await page.addInitScript((standalone) => {
    if (standalone) Object.defineProperty(navigator, "standalone", { value: true });
    const NativeContext = window.AudioContext;
    let contexts = 0;
    let decodes = 0;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        document.documentElement.dataset.audioContexts = String(++contexts);
      }
      override decodeAudioData(data: ArrayBuffer) {
        document.documentElement.dataset.sampleDecodes = String(++decodes);
        return super.decodeAudioData(data);
      }
    };
  }, info.project.name === "webkit-mobile");
  const audioRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/audio/")) audioRequests.push(request.url());
  });

  await page.goto("/");
  const hear = page.getByRole("button", { name: "Hear C", exact: true });
  const playing = page.getByText("Acoustic preview", { exact: true });
  const html = page.locator("html");
  await activate(hear);
  await expect(playing).toBeVisible();
  await expect(html).toHaveAttribute("data-audio-contexts", "1");
  await expect(html).toHaveAttribute("data-sample-decodes", "9");
  expect(audioRequests).toHaveLength(10);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(playing).toBeHidden();
  await expect(html).toHaveAttribute("data-audio-contexts", "1");

  await activate(hear);
  await expect(playing).toBeVisible();
  await expect(html).toHaveAttribute("data-audio-contexts", "1");
  await expect(html).toHaveAttribute("data-sample-decodes", "9");
  expect(audioRequests).toHaveLength(10);
});
