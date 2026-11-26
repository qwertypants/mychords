import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { activate, expandFilters } from "../activate";

declare global {
  interface Window { offlineAnalyser?: AnalyserNode }
}

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("status").filter({ hasText: "Ready offline" })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
}

async function updateState(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const result = new Promise<string>((resolve) => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" || worker.state === "redundant") resolve(worker.state);
        });
      }, { once: true });
    });
    await registration.update();
    return result;
  });
}

test.beforeEach(async ({ request }) => {
  await request.post("/__pwa-test/release?version=a");
});

for (const path of ["/", "/mychords/"]) {
  test(`${path} entire app and never-played audio work on a fresh offline page`, async ({ page, context }) => {
    await ready(page, path);
    const registration = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(new URL(registration).pathname).toBe(path);
    const manifest = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifest).toBeTruthy();
    const response = await page.request.get(new URL(manifest!, page.url()).href);
    const data = await response.json();
    expect(data).toMatchObject({ name: "MyChords", start_url: "./", scope: "./", display: "standalone" });
    for (const icon of data.icons) {
      const iconResponse = await page.request.get(new URL(icon.src, new URL(manifest!, page.url())).href);
      expect(iconResponse.ok()).toBe(true);
      expect(iconResponse.headers()["content-type"]).toBe("image/png");
    }
    const installed = await context.newPage();
    await installed.addInitScript(() => {
      const NativeContext = window.AudioContext;
      window.AudioContext = class extends NativeContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          const analyser = this.createAnalyser();
          window.offlineAnalyser = analyser;
          const makeGain = this.createGain.bind(this);
          this.createGain = () => {
            const gain = makeGain();
            gain.connect(analyser);
            return gain;
          };
          const silent = makeGain();
          silent.gain.value = 0;
          analyser.connect(silent);
          silent.connect(this.destination);
        }
      };
    });
    await context.setOffline(true);
    await installed.goto(path);
    await page.close();
    const errors: string[] = [];
    installed.on("pageerror", (error) => errors.push(error.message));
    await activate(installed.getByRole("button", { name: "Hear C", exact: true }));
    await expect(installed.getByText("Acoustic preview", { exact: true })).toBeVisible();
    const peak = await installed.evaluate(async () => {
      const analyser = window.offlineAnalyser;
      if (!analyser) throw new Error("No offline audio analyser");
      const frame = new Float32Array(analyser.fftSize);
      let peak = 0;
      const until = performance.now() + 400;
      while (performance.now() < until) {
        analyser.getFloatTimeDomainData(frame);
        peak = Math.max(peak, ...frame.map(Math.abs));
        await new Promise(requestAnimationFrame);
      }
      return peak;
    });
    expect(peak).toBeGreaterThan(0.001);
    expect(peak).toBeLessThan(1);
    await activate(installed.getByRole("button", { name: "Stop playback" }));
    await activate(installed.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first());
    await installed.getByLabel("Song name", { exact: true }).fill("Offline song");
    await activate(installed.getByRole("button", { name: "Add chord", exact: true }).first());
    await expandFilters(installed);
    await activate(installed.getByRole("button", { name: "Major", exact: true }));
    await activate(installed.getByRole("button", { name: "Shapes for C", exact: true }));
    await activate(installed.getByRole("region", { name: "Fingerings for C", exact: true })
      .getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true }));
    await activate(installed.getByRole("button", { name: "Close chord library" }));
    await installed.reload();
    await activate(installed.getByRole("button", { name: "Open Offline song", exact: true }));
    await expect(installed.locator("[data-entry-id]")).toHaveCount(1);
    await expect(installed.getByLabel("Song name", { exact: true })).toHaveValue("Offline song");
    const credits = await context.newPage();
    await credits.goto(`${path}credits.html`);
    await expect(credits.getByRole("heading", { name: "Credits & sources" })).toBeVisible();
    await credits.getByRole("link", { name: "DM Sans", exact: true }).click();
    await expect(credits.locator("body")).toContainText("SIL OPEN FONT LICENSE");
    expect(errors).toEqual([]);
    expect(await installed.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await installed.screenshot({ path: `artifacts/pwa-${test.info().project.name}-${path === "/" ? "root" : "prefix"}.png`, fullPage: true });
  });

  test(`${path} update waits for all windows and preserves songs and other caches`, async ({ page, context, request }) => {
    await ready(page, path);
    await page.reload();
    await page.evaluate(async () => {
      const cache = await caches.open(`other-app-precache-v2-${location.origin}/neighbor/`);
      await cache.put("/unrelated", new Response("keep"));
    });
    await activate(page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first());
    await page.getByLabel("Song name", { exact: true }).fill("Saved before update");
    await page.getByLabel("Song name", { exact: true }).fill("Autosaved idea");
    const second = await context.newPage();
    await second.goto(path);
    await request.post("/__pwa-test/release?version=b");
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.getByText(/Update ready\./)).toBeVisible();
    await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Autosaved idea");
    await page.close();
    await expect.poll(() => second.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true);
    // An about:blank page keeps the browser context alive without controlling the app.
    const reopened = await context.newPage();
    await second.close();
    await expect.poll(async () => (await (await request.get("/__pwa-test/state")).json()).activeRelease).toBe("b");
    await reopened.goto(path);
    await expect.poll(() => reopened.evaluate(async () => (await navigator.serviceWorker.ready).waiting === null)).toBe(true);
    await context.setOffline(true);
    await reopened.reload();
    await expect(reopened.getByRole("button", { name: "Open Autosaved idea", exact: true })).toBeVisible();
    expect(await reopened.evaluate(async () => Boolean(await (await caches.open(`other-app-precache-v2-${location.origin}/neighbor/`)).match("/unrelated")))).toBe(true);
  });

  test(`${path} failed update keeps the active release usable offline`, async ({ page, context, request }) => {
    await ready(page, path);
    await page.reload();
    await request.post("/__pwa-test/release?version=broken");
    expect(await updateState(page)).toBe("redundant");
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.installing === null && registration.waiting === null;
    })).toBe(true);
    await expect(page.getByText(/Update ready\./)).toHaveCount(0);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("button", { name: "Hear C", exact: true })).toBeVisible();
    await activate(page.getByRole("button", { name: "Hear C", exact: true }));
    await expect(page.getByText("Acoustic preview", { exact: true })).toBeVisible();
  });
}

test("Chromium reports an installable manifest", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Chromium installability protocol");
  await ready(page, "/mychords/");
  await page.reload();
  const session = await context.newCDPSession(page);
  await expect.poll(async () => {
    const result = await session.send("Page.getInstallabilityErrors");
    return result.installabilityErrors;
  }).toEqual([]);
});

test("incomplete first installation never announces offline readiness", async ({ page, request }) => {
  await request.post("/__pwa-test/release?version=broken");
  // Capture the first install's terminal state before application registration.
  await page.addInitScript(() => {
    window.addEventListener("load", async () => {
      const registration = await navigator.serviceWorker.register("./sw.js");
      const track = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          document.documentElement.dataset.installState = worker.state;
        });
      };
      registration.addEventListener("updatefound", track);
      track();
    });
  });
  await page.goto("/mychords/");
  await expect(page.locator("html")).toHaveAttribute("data-install-state", "redundant");
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !registration || (!registration.installing && !registration.active);
  })).toBe(true);
  await expect(page.getByText(/Ready offline/)).toHaveCount(0);
});

test("shared query link opens offline under the deployed subpath", async ({ page, context }) => {
  await ready(page, "/mychords/");
  await page.reload();
  await context.setOffline(true);
  const encoded = btoa(JSON.stringify({ version: 1, name: "Offline shared song", sections: [] })).replace(/=+$/, "");
  await page.goto("/mychords/?song=" + encoded);
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Offline shared song");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs[0].name)).toBe("Offline shared song");
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Offline shared song" })).toBeVisible();
});
