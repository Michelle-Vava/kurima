// Regenerate the README screenshots against live Open-Meteo data.
// Usage: node scripts/screenshots.mjs
// Starts its own Vite dev server on a free port and stops it when done, so it
// never disturbs a server you already have running.
import { spawn } from 'node:child_process'
import { chromium, devices } from '@playwright/test'
import { freePort } from './free-port.mjs'

const port = Number(process.env.E2E_PORT) || (await freePort())
const base = process.env.BASE_URL ?? `http://localhost:${port}`
const ownServer = !process.env.BASE_URL

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`dev server never came up at ${url}`)
}

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

let server
if (ownServer) {
  server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  await waitFor(base)
}
const browser = await chromium.launch()
try {
  const desktop = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })
  await capture(desktop, /^Harare/, 'docs/screenshot-desktop.png')
  const mobile = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 })
  await capture(mobile, /^Gwanda/, 'docs/screenshot-mobile.png')
} finally {
  await browser.close()
  server?.kill()
}
