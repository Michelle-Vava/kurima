// Screenshot the explanatory charts in docs/explain. Usage: node scripts/explain-charts.mjs
import { chromium } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
const dir = resolve('docs/explain')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 2 })
for (const f of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  await page.goto(`file://${dir}/${f}`)
  await page.locator('.wrap').screenshot({ path: `${dir}/${f.replace('.html', '.png')}` })
  console.log(f)
}
await browser.close()
