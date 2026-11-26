import { expect, test } from "@playwright/test";
import { activate, expandFilters } from "./activate";

test("note labels follow the fingering everywhere a chord chart appears", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => {
      document.documentElement.dataset.copied = text;
    } } });
  });
  await page.goto("/");
  await expect(page.locator(".hero-chord").nth(0).locator(".string-letter")).toHaveText(["", "C", "E", "G", "C", "E"]);
  await expect(page.locator(".hero-chord").nth(1).locator(".string-letter")).toHaveText(["", "A", "E", "A", "C", "E"]);
  await expect(page.locator(".hero-chord").nth(2).locator(".string-letter")).toHaveText(["G", "B", "D", "G", "B", "G"]);

  await activate(page.getByRole("button", { name: "New song", exact: true }).first());
  await page.getByLabel("Song name", { exact: true }).fill("Note labels");
  await activate(page.getByRole("button", { name: "Add chord", exact: true }).first());
  await expandFilters(page);
  await activate(page.getByRole("button", { name: "Major", exact: true }));
  await expect(page.locator(".chord-group [data-voicing='C:major:-1,3,2,0,1,0'] .string-letter")).toHaveText(["", "C", "E", "G", "C", "E"]);
  await activate(page.getByRole("button", { name: /^Shapes for C, \d+ other shapes?$/ }));
  const high = page.getByRole("region", { name: "Fingerings for C", exact: true }).locator("[data-voicing='C:major:8,10,10,9,8,8']");
  await expect(high.locator(".string-letter")).toHaveText(["C", "G", "C", "E", "G", "C"]);
  await activate(high.getByRole("button", { name: /^Add C,/ }));
  await activate(page.getByRole("button", { name: "Close chord library" }));
  const labels = page.locator(".song-chord .string-letter");
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
  for (const label of await labels.all()) await expect(label).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Song name", { exact: true })).toHaveValue("Note labels");
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
  await activate(page.getByRole("button", { name: "Share", exact: true }));
  await expect(page.locator("html")).toHaveAttribute("data-copied", /\?song=/);
  const link = await page.locator("html").getAttribute("data-copied");
  await page.goto(link!);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(labels).toHaveText(["C", "G", "C", "E", "G", "C"]);
});
