import { expect, test } from "@playwright/test";

test("compact picker keeps chords reachable and roots scroll with edge fades", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 540 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore chords", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Search chords" }).press("Escape");
  const toggle = dialog.getByRole("button", { name: "Filters", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.getByRole("group", { name: "Strum speed" })).toBeHidden();
  await expect(dialog.locator(".chord-tone-key")).toHaveCount(0);
  await expect(dialog.locator(".chord-diagram").first()).toBeInViewport({ ratio: 0.9 });
  const roots = dialog.getByRole("group", { name: "Chord roots" });
  await expect(roots).toHaveAttribute("data-fade-right", "true");
  const ys = await roots.getByRole("button").evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().y));
  expect(new Set(ys).size).toBe(1);
  await roots.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect(roots).toHaveAttribute("data-fade-left", "true");
  await expect(roots).toHaveAttribute("data-fade-right", "false");
  await roots.getByRole("button", { name: "B", exact: true }).click();
  await expect(roots.getByRole("button", { name: "B", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(roots.getByRole("button", { name: "B", exact: true })).toBeInViewport({ ratio: 0.99 });
  const searchToggle = dialog.getByRole("button", { name: "Search & notes" });
  const count = await dialog.locator(".results-count").textContent();
  await searchToggle.click();
  await expect(searchToggle).toHaveAttribute("aria-expanded", "false");
  await expect(roots).toBeHidden();
  await expect(dialog.locator(".chord-diagram").first()).toBeInViewport({ ratio: 0.9 });
  await expect(dialog.getByRole("combobox", { name: "Search chords" })).toBeHidden();
  expect(await dialog.locator(".results-count").textContent()).toBe(count);
  await searchToggle.click();
  await expect(roots.getByRole("button", { name: "B", exact: true })).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  const groups = dialog.locator(".picker-option-groups");
  const layout = await groups.evaluate(container => {
    const [neck, speed] = [...container.children].map(element => element.getBoundingClientRect());
    const choices = [...container.querySelectorAll(".icon-option-face")].map(element => element.getBoundingClientRect());
    const rowsInEachGroup = [...container.querySelectorAll(".icon-options-row")].every(row =>
      new Set([...row.querySelectorAll(".icon-option-face")].map(choice => Math.round(choice.getBoundingClientRect().top))).size === 2,
    );
    return {
      sameBand: Math.abs(neck.top - speed.top) < 1,
      separated: neck.right < speed.left,
      allFit: choices.every(choice => choice.left >= container.getBoundingClientRect().left && choice.right <= container.getBoundingClientRect().right),
      rowsInEachGroup,
      choiceCount: choices.length,
    };
  });
  expect(layout).toEqual({ sameBand: true, separated: true, allFit: true, rowsInEachGroup: true, choiceCount: 8 });
  await dialog.getByRole("radio", { name: "Slow" }).check();
  const last = dialog.locator(".catalog-note");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await expect(dialog.getByRole("combobox", { name: "Search chords" })).toBeInViewport();
  await toggle.click();
  await toggle.click();
  await expect(dialog.getByRole("radio", { name: "Slow" })).toBeChecked();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});
