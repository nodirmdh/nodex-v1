import { defineConfig, devices } from "@playwright/test";

const clientURL = "http://127.0.0.1:3100";
const driverURL = "http://127.0.0.1:3101";
const adminURL = "http://127.0.0.1:3102";
const apiURL = "http://127.0.0.1:3103";
const apiHealthURL = `${apiURL}/api/v1/health`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }]],
  webServer: [
    {
      command: "pnpm --filter @nodex/client-mini-app dev:e2e",
      cwd: ".",
      url: clientURL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @nodex/driver-mini-app dev:e2e",
      cwd: ".",
      url: driverURL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @nodex/admin-web dev:e2e",
      cwd: ".",
      url: adminURL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command:
        "pnpm exec cross-env API_PORT=3103 AUTH_ACCESS_TOKEN_SECRET=replace-with-access-token-secret AUTH_MOCK_ENABLED=true DATABASE_URL=postgresql://nodex:nodex@localhost:15432/nodex?schema=public JWT_SECRET=replace-with-local-secret REDIS_URL=redis://localhost:6379 pnpm --filter @nodex/api dev",
      cwd: ".",
      url: apiHealthURL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
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
