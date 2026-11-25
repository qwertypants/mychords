import { test, type Locator } from "@playwright/test";

export async function activate(locator: Locator) {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}
