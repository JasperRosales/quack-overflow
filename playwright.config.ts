import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    // Mock mode: the smoke test never calls the real API.
    command: `npx next dev -p ${PORT}`,
    env: { MOCK_AI: "true" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
