import { test, expect } from "@playwright/test";

async function openPicker(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Shapes temporarily closes only open menus at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    await openPicker(page);
    const search = page.getByRole("button", { name: "Search & notes" });
    const filters = page.getByRole("button", { name: "Filters", exact: true });
    const shape = page.getByRole("button", { name: "Shapes for C/A", exact: true });

    for (const searchOpen of [false, true]) {
      for (const filtersOpen of [false, true]) {
        if ((await search.getAttribute("aria-expanded")) !== String(searchOpen)) await search.click();
        if ((await filters.getAttribute("aria-expanded")) !== String(filtersOpen)) await filters.click();
        if (viewport.height <= 600 && searchOpen && filtersOpen) {
          await shape.evaluate((button: HTMLButtonElement) => button.click());
        } else await shape.click();
        await expect(search).toHaveAttribute("aria-expanded", "false");
        await expect(filters).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator("#picker-search-controls")).toBeHidden();
        await expect(page.locator("#picker-filter-controls")).toBeHidden();
        await page.getByRole("button", { name: "Close shapes" }).click();
        await expect(search).toHaveAttribute("aria-expanded", String(searchOpen));
        await expect(filters).toHaveAttribute("aria-expanded", String(filtersOpen));
      }
    }

    if (await filters.getAttribute("aria-expanded") === "false") await filters.click();
    if (viewport.height <= 600) await shape.evaluate((button: HTMLButtonElement) => button.click());
    else await shape.click();
    await expect(filters).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Close shapes" }).click();
    if (await search.getAttribute("aria-expanded") === "false") await search.click();
    if (await filters.getAttribute("aria-expanded") === "false") await filters.click();
    await expect(shape).toHaveAttribute("aria-expanded", "false");
    await expect(filters).toHaveAttribute("aria-expanded", "true");
    if (viewport.height <= 600) await shape.evaluate((button: HTMLButtonElement) => button.click());
    else await shape.click();
    await page.reload();
    await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Filters", exact: true })).toHaveAttribute("aria-expanded", "true");
  });
}

test("Shapes leaves menus open on a wide viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await openPicker(page);
  const search = page.getByRole("button", { name: "Search & notes" });
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  if (await filters.getAttribute("aria-expanded") === "false") await filters.click();
  await page.getByRole("button", { name: "Shapes for C/A", exact: true }).click();
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await expect(filters).toHaveAttribute("aria-expanded", "true");
});

test("fan focuses its controls and Escape returns to the shape trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPicker(page);
  const trigger = page.getByRole("button", { name: "Shapes for C/A", exact: true });
  await trigger.click();
  const panel = page.getByRole("region", { name: "Fingerings for C/A" });
  await expect(panel.getByRole("button", { name: "Close shapes" })).toBeFocused();
  await expect(page.locator(".picker-scroll")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator(".picker-scroll")).not.toHaveAttribute("inert", "");
});

test("fan keeps its origin in place and leaves every shape actionable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPicker(page);
  const original = page.locator('.picker-scroll .shape-toggle[aria-label="Shapes for C/A"]');
  await original.click();
  const origin = page.locator(".shape-fan-origin");
  const sourceBox = await original.locator("..").boundingBox();
  const originBox = await origin.boundingBox();
  expect(Math.abs(sourceBox!.x - originBox!.x)).toBeLessThan(2);
  expect(Math.abs(sourceBox!.y - originBox!.y)).toBeLessThan(2);
  const alternatives = page.locator(".shape-fan-card");
  expect(await alternatives.count()).toBe(Number(await original.getAttribute("data-shape-count")));
  for (const shape of await alternatives.all()) {
    await shape.getByRole("button", { name: /^Hear / }).click();
  }
  await alternatives.last().getByRole("button", { name: /^Add / }).click();
  await page.locator(".shape-fan-backdrop").click({ position: { x: 2, y: 2 } });
  await expect(origin).toHaveCount(0);
  await expect(original).toBeFocused();
  await original.click();
  await page.locator(".shape-fan-origin .shape-toggle").click();
  await expect(origin).toHaveCount(0);
  await expect(original).toBeFocused();
});

test("scrolling through chords frees space and keeps chords interactive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPicker(page);
  const search = page.getByRole("button", { name: "Search & notes" });
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  if (await filters.getAttribute("aria-expanded") === "false") await filters.click();
  const scroller = page.locator(".picker-scroll");
  const menus = page.locator(".picker-menu-stack");
  const before = (await scroller.boundingBox())!.height;
  await scroller.evaluate(element => { element.scrollTop = 250; });
  await expect(menus).toHaveClass(/is-hidden/);
  await expect.poll(async () => (await scroller.boundingBox())!.height).toBeGreaterThan(before + 50);
  await expect(menus).toHaveAttribute("inert", "");
  const chord = page.locator(".chord-group").first();
  await chord.getByRole("button", { name: /^Hear / }).click();
  await chord.getByRole("button", { name: /^Add / }).click();
  await scroller.evaluate(element => { element.scrollTop -= 80; });
  await expect(menus).not.toHaveClass(/is-hidden/);
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await expect(filters).toHaveAttribute("aria-expanded", "true");
});
