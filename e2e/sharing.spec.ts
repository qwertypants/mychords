import { test, expect } from "@playwright/test";

test("share an unsaved snapshot into a separate library", async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text; } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  await page.getByLabel("Song name", { exact: true }).fill("Café 🎸");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("tooltip")).toHaveText("Copied");
  await expect(page.locator(".share-status")).not.toContainText("Link copied.");
  const link = await page.locator("html").getAttribute("data-copied");
  expect(link).toContain("?song=");
  const recipient = await browser.newContext({ viewport: page.viewportSize() });
  const other = await recipient.newPage();
  await other.goto(link! + "&keep=yes");
  await expect(other.getByRole("heading", { name: "Open Café 🎸 in MyChords" })).toBeVisible();
  expect(other.url()).toBe(link! + "&keep=yes");
  expect(await other.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBeNull();
  await other.getByRole("button", { name: "Continue in browser" }).click();
  await expect(other.getByLabel("Song name", { exact: true })).toHaveValue("Café 🎸");
  expect(new URL(other.url()).search).toBe("?keep=yes");
  expect(await other.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs.length)).toBe(1);
  await other.getByRole("button", { name: "All songs", exact: true }).click();
  await expect(other.getByRole("dialog")).toHaveCount(0);
  await other.goto(link!);
  await expect(other.getByRole("heading", { name: "Open Café 🎸 in MyChords" })).toBeVisible();
  await other.getByRole("button", { name: "Continue in browser" }).click();
  expect(await other.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs.length)).toBe(2);
  const titleBounds = await other.getByLabel("Song name", { exact: true }).boundingBox();
  expect(titleBounds!.width).toBeGreaterThan(200);
  await other.screenshot({ path: `artifacts/share-${test.info().project.name}.png`, fullPage: true });
  expect(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await recipient.close();
});

test("clipboard failure does not open a modal and invalid links preserve data", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.locator(".share-status")).toContainText("Could not copy link");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/?song=invalid");
  await expect(page.getByRole("alert")).toContainText("shared song link is invalid");
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
});

test("shared copy waits for storage recovery", async ({ page }) => {
  const payload = btoa(JSON.stringify({ version: 1, name: "After recovery", sections: [] }));
  await page.addInitScript(() => localStorage.setItem("mychords.library.v1", "broken"));
  await page.goto("/?song=" + payload);
  await expect(page.getByText("Let’s keep your ideas safe.")).toBeVisible();
  expect(page.url()).toContain("?song=");
  await page.getByRole("button", { name: "Start fresh" }).click();
  await page.getByRole("button", { name: "Replace with empty library" }).click();
  await expect(page.getByRole("heading", { name: "Open After recovery in MyChords" })).toBeVisible();
  expect(page.url()).toContain("?song=");
  await page.getByRole("button", { name: "Continue in browser" }).click();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("After recovery");
});


test("pasted legacy link opens locally and invalid paste leaves library untouched", async ({ page }) => {
  const payload = btoa(JSON.stringify({ version: 1, name: "Pasted song", sections: [] }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open shared link" }).click();
  await page.getByLabel("Paste a MyChords song link").fill(`https://example.test/?song=${payload}`);
  await page.getByRole("button", { name: "Open song" }).click();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Pasted song");
  expect(new URL(page.url()).pathname).toMatch(/\/songs\/[^/]+$/);
  const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
  await page.getByRole("button", { name: "MyChords home" }).click();
  await page.getByRole("button", { name: "Open shared link" }).click();
  await page.getByLabel("Paste a MyChords song link").fill("https://example.test/?song=invalid");
  await page.getByRole("button", { name: "Open song" }).click();
  await expect(page.getByRole("alert")).toContainText("invalid");
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
});

test("installed launch imports directly and a failed save leaves a retryable draft", async ({ page }) => {
  const payload = btoa(JSON.stringify({ version: 1, name: "App launch", sections: [] })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === "(display-mode: standalone)" ? { matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false, onchange: null } : original(query);
    const setItem = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function(key, value) {
      if (key === "mychords.library.v1" && fail) { fail = false; throw new Error("Storage unavailable"); }
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/?song=" + encodeURIComponent(payload));
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("App launch");
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  expect(page.url()).not.toContain("?song=");
  await page.getByRole("button", { name: "Retry saving" }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs.length)).toBe(1);
});

test("handoff shows a selectable link when copying fails", async ({ page }) => {
  const payload = btoa(JSON.stringify({ version: 1, name: "Copy fallback", sections: [] })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.goto("/?song=" + encodeURIComponent(payload));
  await page.getByRole("button", { name: "Copy song link" }).click();
  await expect(page.getByRole("textbox", { name: "Shared song link" })).toHaveValue(page.url());
});

test("new song editor imports a shared link and removes its untouched starter", async ({ page }) => {
  const encoded = btoa(JSON.stringify({ version: 1, name: "From a link", sections: [] })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const input = page.getByRole("textbox", { name: "Open a shared song link" });
  await expect(input).toBeVisible();
  await expect(page.getByRole("button", { name: "Add section" })).toBeVisible();
  await input.fill("https://example.test/?song=" + encoded);
  await page.getByRole("button", { name: "Open song", exact: true }).click();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("From a link");
  const songs = await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs);
  expect(songs.map((song: { name: string }) => song.name)).toEqual(["From a link"]);
  await expect(input).toHaveCount(0);
});

test("invalid editor link preserves the starter and edited starters remain saved", async ({ page }) => {
  const encoded = btoa(JSON.stringify({ version: 1, name: "Imported", sections: [] })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const input = page.getByRole("textbox", { name: "Open a shared song link" });
  const before = await page.evaluate(() => localStorage.getItem("mychords.library.v1"));
  await input.fill("https://example.test/?song=invalid");
  await page.getByRole("button", { name: "Open song", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("invalid");
  expect(await page.evaluate(() => localStorage.getItem("mychords.library.v1"))).toBe(before);
  await page.getByLabel("Song name", { exact: true }).fill("My own idea");
  await input.fill("https://example.test/?song=" + encoded);
  await page.getByRole("button", { name: "Open song", exact: true }).click();
  const songs = await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs);
  expect(songs.map((song: { name: string }) => song.name)).toEqual(["Imported", "My own idea"]);
});

test("failed editor import keeps the new draft and retries the atomic replacement", async ({ page }) => {
  const encoded = btoa(JSON.stringify({ version: 1, name: "Retry import", sections: [] })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).first().click();
  const starterId = new URL(page.url()).pathname.split("/").pop();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function(key, value) {
      if (key === "mychords.library.v1" && fail) { fail = false; throw new Error("full"); }
      return original.call(this, key, value);
    };
  });
  await page.getByRole("textbox", { name: "Open a shared song link" }).fill("https://example.test/?song=" + encoded);
  await page.getByRole("button", { name: "Open song", exact: true }).click();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Retry import");
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs[0].id)).toBe(starterId);
  await page.getByRole("button", { name: "Retry saving" }).click();
  const songs = await page.evaluate(() => JSON.parse(localStorage.getItem("mychords.library.v1")!).songs);
  expect(songs.map((song: { name: string }) => song.name)).toEqual(["Retry import"]);
});
