import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config — docs/TESTING.md T-11.
 *
 * This runs the real UI against the real API and a real Postgres. It is deliberately NOT mocked:
 * the point is to cover what pytest structurally cannot — the session cookie, the CSRF
 * double-submit, and the typed client — so anything faked here would defeat it.
 *
 * Prerequisite: the backend stack is up (`docker compose up -d` from the repo root).
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The journey is one ordered story; running its steps in parallel would be meaningless.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
