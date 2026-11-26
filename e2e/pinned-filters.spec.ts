import { test, expect } from "@playwright/test";

for (const short of [false, true]) {
  test(`filters stay reachable after scrolling${short ? " in landscape" : ""}`, async ({ page }) => {
    if (short) await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
    await page.getByRole("button", { name: "Search & notes" }).click();
    const toggle = page.getByRole("button", { name: "Filters", exact: true });
    const panel = page.locator("#picker-filter-controls");
    const scroller = page.locator(".picker-scroll");
    if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();
    await scroller.evaluate(el => { el.scrollTop = 800; });
    const offset = await scroller.evaluate(el => el.scrollTop);
    expect(offset).toBeGreaterThan(0);
    await toggle.click();
    await expect(page.getByRole("button", { name: "Major", exact: true })).toBeInViewport();
    expect(await scroller.evaluate(el => el.scrollTop)).toBe(offset);
    const top = (await panel.boundingBox())!.y;
    await scroller.evaluate(el => { el.scrollTop += 300; });
    expect((await panel.boundingBox())!.y).toBe(top);
    await page.getByRole("button", { name: "Minor", exact: true }).click();
    await expect(page.getByRole("button", { name: "Minor", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("radio", { name: "Frets 5–9" }).check();
    await panel.getByRole("radio", { name: "Slow", exact: true }).check();
    await expect(panel.getByRole("radio", { name: "Slow", exact: true })).toBeInViewport();
    expect((await scroller.boundingBox())!.height).toBeGreaterThan(0);
    await toggle.click();
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(page.getByRole("radio", { name: "Frets 5–9" })).toBeChecked();
    await expect(panel.getByRole("radio", { name: "Slow", exact: true })).toBeChecked();
    await page.screenshot({ path: test.info().outputPath("pinned-filters.png") });
  });
}
