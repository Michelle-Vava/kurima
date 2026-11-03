import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the Vite dev server with every Open-Meteo
// request faked (see e2e/fixtures.ts), so they never depend on live weather.
// The dev server does not register the service worker, which keeps the fakes
// in control of the network.
//
// E2E_PORT is chosen by scripts/run-e2e.mjs (`npm run e2e`) and must be set
// before the config loads: every worker re-imports this file, so picking a
// port here would give each one a different answer. Playwright starts the
// server on that port and stops it again at the end of the run, so nothing
// already listening elsewhere is touched.
const PORT = Number(process.env.E2E_PORT) || 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
