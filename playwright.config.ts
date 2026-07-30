import { defineConfig, devices } from "@playwright/test";

const clientURL = "http://127.0.0.1:3100";
const driverURL = "http://127.0.0.1:3101";
const adminURL = "http://127.0.0.1:3102";
const apiURL = "http://127.0.0.1:3103";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], baseURL: clientURL },
    },
    {
      name: "mobile",
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: clientURL },
    },
  ],
});
