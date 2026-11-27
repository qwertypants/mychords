import { activate, expandFilters } from "./activate";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const OPEN_C = "C:major:-1,3,2,0,1,0",
  MID_C = "C:major:-1,3,5,5,5,3",
  HIGH_C = "C:major:8,10,10,9,8,8";
async function newSong(page: Page) {
  await page.goto("/");
  await activate(page
    .getByRole("button", { name: "New song", exact: true })
    .filter({ visible: true })
    .first()
    );
  await page.getByLabel("Song name", { exact: true }).fill("Sunday idea");
}
async function addCs(page: Page) {
  await activate(page
    .getByRole("button", { name: "Add chord", exact: true })
    .first()
    );
  await expandFilters(page);
  await activate(page.getByRole("button", { name: "Major", exact: true }));
  await activate(page.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ }));
  const displayedC = page.locator(".shape-fan-canvas");
  await activate(displayedC.getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true }));
  await activate(page
    .getByRole("button", { name: "Add C, 8 10 10 9 8 8", exact: true })
    );
  await activate(displayedC.getByRole("button", { name: "Add C, -1 3 2 0 1 0", exact: true }));
  await activate(displayedC.getByRole("button", { name: "Close shapes" }));
  await activate(page.getByRole("button", { name: "Close chord library" }));
}
test("song-card arrows select exact shapes without changing duplicate chords", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await newSong(page);
  await addCs(page);
  const firstCard = page.locator("[data-entry-id]").first();
  await expect(firstCard.getByRole("button", { name: "Previous shape for C, position 1" })).toBeDisabled();
  await activate(firstCard.getByRole("button", { name: "Next shape for C, position 1" }));
  await expect(firstCard.getByRole("button", { name: "Previous shape for C, position 1" })).toBeEnabled();
  await expect(firstCard.getByRole("button", { name: "Play C D string fret 5, G, perfect fifth" })).toBeVisible();
  for (let i = 0; i < 5; i++)
    await activate(firstCard.getByRole("button", { name: "Next shape for C, position 1" }));
  await expect(firstCard.getByRole("button", { name: "Next shape for C, position 1" })).toBeDisabled();
  for (let i = 0; i < 5; i++)
    await activate(firstCard.getByRole("button", { name: "Previous shape for C, position 1" }));
  await expect(page.locator("[data-entry-id]")).toHaveCount(3);
  expect(
    await page
      .locator("[data-entry-id]")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-voicing"))),
  ).toEqual([MID_C, HIGH_C, OPEN_C]);
  await activate(page.getByRole("button", { name: "Add section", exact: true }));
  await page.getByLabel("Section name").last().fill("Chorus");
  await expect(page.locator(".song-toolbar")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Sunday idea");
  await expect(page.getByLabel("Section name").nth(0)).toHaveValue("Verse");
  await expect(page.getByLabel("Section name").nth(1)).toHaveValue("Chorus");
  expect(
    await page
      .locator("[data-entry-id]")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-voicing"))),
  ).toEqual([MID_C, HIGH_C, OPEN_C]);
  await activate(page.getByRole("button", { name: "All songs", exact: true }));
  await activate(page
    .getByRole("button", { name: "New song", exact: true })
    .filter({ visible: true })
    .first()
    );
  await page.getByLabel("Song name", { exact: true }).fill("Second idea");
  await activate(page.getByRole("button", { name: "All songs", exact: true }));
  await activate(page
    .getByRole("button", { name: "Open Sunday idea", exact: true })
    );
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator("[data-entry-id]")).toHaveCount(3);
  expect(errors).toEqual([]);
});
test("a chord with one shape has both shape arrows disabled", async ({ page }) => {
  await newSong(page);
  await activate(page.getByRole("button", { name: "Add chord", exact: true }).first());
  await page.getByRole("combobox", { name: "Search chords" }).fill("Ab9#11");
  await activate(page.getByRole("button", { name: "Add Ab9#11, -1 11 10 11 11 10" }));
  await activate(page.getByRole("button", { name: "Close chord library" }));
  const card = page.locator("[data-entry-id]").first();
  await expect(card).toHaveAttribute("data-voicing", "Ab:9#11:-1,11,10,11,11,10");
  await expect(card.getByRole("button", { name: "Previous shape for Ab9#11, position 1" })).toBeDisabled();
  await expect(card.getByRole("button", { name: "Next shape for Ab9#11, position 1" })).toBeDisabled();
});
test("unsaved navigation and failed saves preserve the draft", async ({
  page,
}) => {
  await newSong(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByLabel("Song name", { exact: true }).fill("Sunday idea unsaved");
  await expect(page.getByRole("alert")).toContainText("Could not save");

  await activate(page.getByRole("button", { name: "All songs", exact: true }));
  await activate(page.getByRole("button", { name: "Save changes", exact: true }));
  await expect(page.getByRole("dialog")).toBeVisible();
  await activate(page.getByRole("button", { name: "Cancel", exact: true }));
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue(
    "Sunday idea unsaved",
  );
});
test("corrupt stored data is preserved until explicit reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("mychords.library.v1", "{broken"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let’s keep your ideas safe." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("mychords.library.v1")),
  ).toBe("{broken");
  await activate(page.getByRole("button", { name: "Start fresh", exact: true }));
  await activate(page.getByRole("button", { name: "Cancel", exact: true }));
  expect(
    await page.evaluate(() => localStorage.getItem("mychords.library.v1")),
  ).toBe("{broken");
});
test("real acoustic samples load, preview stops and section playback highlights occurrences", async ({
  page,
}) => {
  const sampleResponses: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/audio/") && r.ok()) sampleResponses.push(r.url());
  });
  await newSong(page);
  await addCs(page);
  const first = page.locator("[data-entry-id]").first();
  const repeated = page.locator("[data-entry-id]").nth(2);
  const strum = await repeated.evaluateHandle((card) => {
    const strings = new Set<string>();
    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        if (!(target instanceof SVGElement)) continue;
        const string = target.getAttribute("data-strum-string");
        const ring = target.querySelector(".strum-ring");
        if (string !== null && ring && Number(getComputedStyle(ring).opacity) > 0) {
          strings.add(string);
        }
      }
    });
    observer.observe(card, { subtree: true, attributes: true, attributeFilter: ["style"] });
    return { strings, observer };
  });
  await activate(page
    .getByRole("button", { name: "Hear C, position 3", exact: true })
    );
  await expect(repeated).toHaveClass(/is-playing/);
  expect(sampleResponses.filter((u) => u.endsWith(".mp3"))).toHaveLength(9);
  await expect(repeated).toHaveClass(/is-playing/);
  await expect(first).not.toHaveClass(/is-playing/);
  await expect.poll(() => strum.evaluate(({ strings }) => [...strings])).toEqual(["1", "2", "3", "4", "5"]);
  await strum.evaluate(({ observer }) => observer.disconnect());
  await strum.dispose();
  await expect(page.getByRole("button", { name: "Stop playback" })).toHaveCount(0);
  await expect(repeated).not.toHaveClass(/is-playing/);
  await expect(repeated.locator("[data-strum-string][style*='--strum-scale']")).toHaveCount(0);
  await expect(repeated.locator("[data-strum-string][style*='--strum-glow']")).toHaveCount(0);
  await expect(
    page.getByText("Acoustic preview", { exact: true }),
  ).not.toBeVisible();
  await activate(page
    .getByRole("button", { name: "Play section Verse", exact: true })
    );
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(1);
  await activate(page.getByRole("button", { name: "Stop section Verse", exact: true }));
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play section Verse", exact: true })).toBeVisible();
  await activate(page.getByRole("button", { name: "Play section Verse", exact: true }));
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Stop playback" })).toHaveCount(0);
  await expect(page.locator(".song-chord.is-playing")).toHaveCount(0, { timeout: 10000 });
});
test("audio failure is shown inside the picker and can be retried", async ({
  page,
}) => {
  await page.route("**/audio/*.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await newSong(page);
  await activate(page.getByRole("button", { name: "Add chord", exact: true }));
  await expandFilters(page);
  await activate(page.getByRole("button", { name: "Major", exact: true }));
  await activate(page
    .getByRole("button", { name: "Hear C, -1 3 2 0 1 0", exact: true })
    );
  await expect(page.getByRole("dialog")).toContainText(
    "Could not load guitar sound. Try again.",
  );
  await expect(page.locator(".voicing-card.is-playing")).toHaveCount(0);
  await page.unroute("**/audio/*.json");
  await activate(page
    .getByRole("button", { name: "Hear C, -1 3 2 0 1 0", exact: true })
    );
  await expect(page.getByRole("dialog").locator(".picker-playback")).toHaveCount(0);
  await activate(page.getByRole("button", { name: "Close chord library" }));
});
test("mobile widths, picker focus and desktop pointer drag", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await newSong(page);
  await addCs(page);
  await activate(page
    .getByRole("button", { name: "Add chord", exact: true })
    .first()
    );
  await expect(page.getByRole("dialog")).toBeVisible();
  const search = page.getByRole("dialog").getByRole("combobox", { name: "Search chords" });
  if (await search.getAttribute("aria-expanded") === "true") await search.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add chord", exact: true }).first(),
  ).toBeFocused();
  if (testInfo.project.name === "desktop") {
    const first = page.getByRole("button", {
        name: "Drag C, position 1",
        exact: true,
      }),
      second = page.getByRole("button", {
        name: "Drag C, position 2",
        exact: true,
      });
    const a = await first.boundingBox(),
      b = await second.boundingBox();
    if (!a || !b) throw new Error("Missing drag handles");
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, {
      steps: 3,
    });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
    await page.mouse.up();
    expect(
      await page
        .locator("[data-entry-id]")
        .first()
        .getAttribute("data-voicing"),
    ).toBe(HIGH_C);
  }
});
test("touch handles reorder chords while the rest of the page scrolls", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Chrome mobile touch protocol check",
  );
  await newSong(page);
  await addCs(page);
  const session = await page.context().newCDPSession(page);
  const first = await page
    .getByRole("button", { name: "Drag C, position 1", exact: true })
    .boundingBox();
  const second = await page
    .getByRole("button", { name: "Drag C, position 2", exact: true })
    .boundingBox();
  if (!first || !second) throw new Error("Missing touch handles");
  const from = { x: first.x + first.width / 2, y: first.y + first.height / 2 },
    to = { x: second.x + second.width / 2, y: second.y + second.height / 2 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  await page.waitForTimeout(230);
  for (let i = 1; i <= 12; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * i) / 12,
          y: from.y + ((to.y - from.y) * i) / 12,
        },
      ],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("[data-entry-id]").first()).toHaveAttribute(
    "data-voicing",
    HIGH_C,
  );
  const before = await page.evaluate(() => scrollY);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 10, y: 700 }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 10, y: 700 - 40 * i }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});

declare global {
  interface Window {
    guitarProbe?: { context: AudioContext; analyser: AnalyserNode };
  }
}
test("real Web Audio produces a measured signal and Stop silences it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        const analyser = this.createAnalyser();
        analyser.fftSize = 2048;
        const silent = this.createGain();
        silent.gain.value = 0;
        analyser.connect(silent);
        silent.connect(this.destination);
        const makeGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = makeGain();
          gain.connect(analyser);
          return gain;
        };
        window.guitarProbe = { context: this, analyser };
      }
    };
  });
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Hear C", exact: true }));
  await expect(
    page.getByText("Acoustic preview", { exact: true }),
  ).toBeVisible();
  const signal = await page.evaluate(async () => {
    const probe = window.guitarProbe;
    if (!probe) throw new Error("No audio context");
    const frame = new Float32Array(probe.analyser.fftSize);
    let peak = 0;
    let energy = 0;
    let samples = 0;
    const until = performance.now() + 400;
    while (performance.now() < until) {
      probe.analyser.getFloatTimeDomainData(frame);
      for (const value of frame) {
        peak = Math.max(peak, Math.abs(value));
        energy += value * value;
        samples++;
      }
      await new Promise(requestAnimationFrame);
    }
    return {
      peak,
      rms: Math.sqrt(energy / samples),
      sampleRate: probe.context.sampleRate,
    };
  });
  expect(signal.peak).toBeGreaterThan(0.001);
  expect(signal.peak).toBeLessThan(1);
  expect(signal.rms).toBeGreaterThan(0.0001);
  await test
    .info()
    .attach("measured-acoustic-signal", {
      body: JSON.stringify(signal),
      contentType: "application/json",
    });
  await activate(page.getByRole("button", { name: "Stop playback" }));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const analyser = window.guitarProbe?.analyser;
        if (!analyser) return 1;
        const frame = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(frame);
        return Math.max(...frame.map(Math.abs));
      }),
    )
    .toBeLessThan(0.0001);
});
