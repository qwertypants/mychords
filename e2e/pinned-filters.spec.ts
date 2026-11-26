import { test, expect } from "@playwright/test";

for (const short of [false, true]) {
  test(`filters return on upward scrolling${short ? " in landscape" : ""}`, async ({ page }) => {
    if (short) await page.setViewportSize({ width: 844, height: 390 });
    else await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
    await page.getByRole("button", { name: "Search & notes" }).click();
    const toggle = page.getByRole("button", { name: "Filters", exact: true });
    const scroller = page.locator(".picker-scroll");
    if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
    await page.getByRole("button", { name: "Minor", exact: true }).click();
    await page.getByRole("radio", { name: "Frets 5–9" }).check();
    const menus = page.locator(".picker-menu-stack");
    await scroller.evaluate(el => { el.scrollTop = 800; });
    await expect(menus).toHaveClass(/is-hidden/);
    await scroller.evaluate(el => { el.scrollTop -= 80; });
    await expect(menus).not.toHaveClass(/is-hidden/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Minor", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("radio", { name: "Frets 5–9" })).toBeChecked();
  });
}
