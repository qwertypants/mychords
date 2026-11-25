import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/pwa",
  outputDir: "./artifacts/pwa-results",
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:4180", trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/pwa-test-server.mjs",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
  ],
});
