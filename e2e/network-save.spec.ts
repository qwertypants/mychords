import { test, expect } from "@playwright/test";
import { activate } from "./activate";

test("add, change shape, and save a song when randomUUID is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await activate(page.getByRole("button", { name: "Explore chords", exact: true }));
  const search = page.getByRole("combobox", { name: "Search chords" });
  await search.fill("C");
  await activate(page.getByRole("option").filter({ has: page.locator("span", { hasText: /^C$/ }) }));
  await activate(page.locator(".add-voicing").first());
  await activate(page.getByRole("button", { name: "Close chord library" }));
  await expect(page.locator("[data-entry-id]")).toHaveCount(1);
  await page.getByLabel("Song name", { exact: true }).fill("Network idea");
  await activate(page.getByRole("button", { name: "Next shape for C, position 1" }));
  const selected = await page.locator("[data-entry-id]").getAttribute("data-voicing");
  await activate(page.getByRole("button", { name: "Add chord", exact: true }).first());
  const reopened = page.getByRole("combobox", { name: "Search chords" });
  if (await reopened.getAttribute("aria-expanded") === "true") await reopened.press("Escape");
  await activate(page.locator(".add-voicing").first());
  await activate(page.getByRole("button", { name: "Close chord library" }));
  await expect(page.locator("[data-entry-id]")).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Network idea");
  await expect(page.locator("[data-entry-id]")).toHaveCount(2);
  await expect(page.locator("[data-entry-id]").first()).toHaveAttribute("data-voicing", selected!);
  expect(errors).toEqual([]);
});
