import { test, type Page, type Locator } from "@playwright/test";

export async function activate(locator: Locator) {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

export async function expandFilters(page: Page) {
  const search = page.getByRole("combobox", { name: "Search chords" });
  if (await search.getAttribute("aria-expanded") === "true") await search.press("Escape");
  const toggle = page.getByRole("dialog").getByRole("button", { name: "Filters", exact: true });
  if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
}
