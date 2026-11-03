// Regenerate the README screenshots against live Open-Meteo data.
// Usage: start the dev server (npm run dev -- --port 4173), then
//        node scripts/screenshots.mjs
// Desktop shows Kisumu, Kenya; mobile shows Kano, Nigeria, as in the README.
import { chromium, devices } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'

async function capture(context, town, path) {
  const page = await context.newPage()
  await page.goto(BASE)
  await page.getByRole('button', { name: town }).click()
  await page.locator('[data-signal], [data-testid="stale"]').first().waitFor({ timeout: 30_000 })
  await page.getByRole('heading', { name: /Normal rainfall here/ }).waitFor({ timeout: 60_000 })
  await page.locator('[data-testid="outlook"], [data-testid="outlook-dry"], .card.error').first().waitFor({ timeout: 60_000 })
  await page.waitForTimeout(500) // let the last card settle
  await page.screenshot({ path, fullPage: true })
  const signal = await page.locator('[data-signal] h2').first().textContent().catch(() => '(no signal)')
  console.log(`${path}: ${town} -> ${signal}`)
  await page.close()
}

const browser = await chromium.launch()
try {
  const desktop = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })
  await capture(desktop, 'Kisumu, Kenya', 'docs/screenshot-desktop.png')
  const mobile = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 })
  await capture(mobile, 'Kano, Nigeria', 'docs/screenshot-mobile.png')
} finally {
  await browser.close()
}
