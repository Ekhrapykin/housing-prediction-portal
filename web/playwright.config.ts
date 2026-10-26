import { defineConfig, devices } from "@playwright/test";

// Runs against an already-running stack (`docker compose up -d --build` from the repo root).
// Browser: the locally installed Google Chrome; set E2E_BROWSER=chromium for Playwright's bundled one
// (needs `npx playwright install chromium`).
export default defineConfig({
  testDir: "./e2e",
  // Estimator writes are rate-limited per IP (20/min); one worker keeps the order and the count predictable.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], ...(process.env.E2E_BROWSER === "chromium" ? {} : { channel: "chrome" }) },
    },
  ],
});
