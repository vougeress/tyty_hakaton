import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3110",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true
      }
    }
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3110",
    env: { E2E_MOCK_MODE: "1" },
    url: "http://127.0.0.1:3110/calendar",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
