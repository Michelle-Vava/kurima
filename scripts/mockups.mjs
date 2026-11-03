// Screenshot the static design mockups in docs/mockups.
// Usage: node scripts/mockups.mjs
import { chromium } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dir = resolve('docs/mockups')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 })
for (const f of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  await page.goto(`file://${dir}/${f}`)
  const out = `${dir}/${f.replace('.html', '.png')}`
  await page.screenshot({ path: out, fullPage: true })
  console.log(out)
}
await browser.close()
