import { test, expect } from "@playwright/test";

test("chord suggestions can be selected where they cover the Filters button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
  const search = page.getByRole("combobox", { name: "Search chords" });
  await search.fill("B/");

  const option = page.getByRole("option").filter({ has: page.getByText("B/Ab", { exact: true }) });
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  await expect(option).toBeVisible();
  const button = await filters.boundingBox();
  const row = await option.boundingBox();
  if (!button || !row) throw new Error("Expected the suggestion and Filters button to be visible");
  const top = Math.max(button.y, row.y);
  const bottom = Math.min(button.y + button.height, row.y + row.height);
  expect(bottom).toBeGreaterThan(top);
  await page.mouse.click(row.x + 16, (top + bottom) / 2);
  await expect(search).toHaveValue("B/Ab", { timeout: 1500 });
  await expect(search).toHaveAttribute("aria-expanded", "false");
});

test("search offers chords on focus and narrows them while typing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New song", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Add chord", exact: true }).first().click();
  const search = page.getByRole("combobox", { name: "Search chords" });
  await search.focus();
  await expect(search).toHaveCSS("font-size", "16px");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  const options = page.getByRole("option");
  const total = await options.count();
  expect(total).toBeGreaterThan(8);
  await search.fill("Am7");
  await expect.poll(() => options.count()).toBeLessThan(total);
  expect(await options.count()).toBeGreaterThan(0);
  await options.filter({ has: page.locator("span", { hasText: /^Am7$/ }) }).click();
  await expect(search).toHaveValue("Am7");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: /^Shapes for Am7, \d+ other shapes?$/ })).toBeVisible();
  await search.focus();
  await search.fill("");
  await expect(options).toHaveCount(total);
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(search).not.toHaveValue("");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.fill("no-such-chord");
  await expect(options).toHaveCount(0);
  await search.fill("");
  await expect(options).toHaveCount(total);
  await page.screenshot({ path: test.info().outputPath("search-options.png") });
});
