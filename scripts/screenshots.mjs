// Regenerate the README screenshots against live Open-Meteo data.
// Usage: node scripts/screenshots.mjs
// Starts its own Vite dev server on a free port and stops it when done, so it
// never disturbs a server you already have running.
import { chromium, devices } from '@playwright/test'
import { startDevServer } from './dev-server.mjs'

const { base, stop } = await startDevServer()

async function capture(context, town, path) {
  const page = await context.newPage()
  await page.goto(base)
  await page.getByRole('button', { name: town }).click()
  await page.locator('[data-signal], [data-testid="stale"]').first().waitFor({ timeout: 30_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: true })
  console.log(`${path}: ${town} -> ${await page.locator('[data-signal] h2').first().textContent()}`)
  await page.close()
}

const browser = await chromium.launch()
try {
  const desktop = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })
  await capture(desktop, /^Harare/, 'docs/screenshot-desktop.png')
  const mobile = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 })
  await capture(mobile, /^Gwanda/, 'docs/screenshot-mobile.png')
} finally {
  await browser.close()
  await stop()
}
