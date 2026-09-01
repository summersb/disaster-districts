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
  reporter: [
    ['html'],
    [
      'monocart-reporter',
      {
        name: 'Disaster Districts e2e Coverage',
        outputFile: './coverage/e2e/index.html',
        coverage: {
          // Vite's dev-mode transform serves each module as its own
          // request with a 1:1 inline sourcemap, so filtering by the
          // request URL (which keeps the real /src/... path) is reliable.
          // The sourcemap's own `sources` entries are often just bare
          // filenames with no directory, so filtering on the resolved
          // source path is not.
          entryFilter: (entry: { url: string }) =>
            entry.url.includes('/src/') && !entry.url.includes('node_modules'),
          sourceFilter: (sourcePath: string) =>
            !sourcePath.includes('routeTree.gen.ts'),
        },
      },
    ],
  ],
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
