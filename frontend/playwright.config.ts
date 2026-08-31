import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // These tests hit the persistent dev docker-compose Postgres, not a fresh
  // per-run database (unlike the backend's @QuarkusTest DevServices
  // container), so tests that create shared records (wards, etc.) can
  // interfere with each other's assumptions if run concurrently.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
