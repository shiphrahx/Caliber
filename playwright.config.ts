import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup runs first — saves session to file
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // All other tests reuse the saved session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
    // Unauthenticated tests (landing, login page)
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /unauthenticated\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
