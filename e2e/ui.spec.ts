// Things about the interface that are easy to break and expensive to notice:
// the explanations behind each figure, scrolling the rain chart into the
// past, and the themes.

import { expect, test } from '@playwright/test'
import { fakeOpenMeteo, goToTab, pickDistrict } from './fixtures.ts'

test('a figure explains itself when tapped', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)

  const stat = page.locator('.stat').filter({ hasText: 'rain already fallen' })
  await expect(stat).not.toContainText('before it will sprout')
  await stat.getByRole('button').click()
  await expect(stat).toContainText('before it will sprout')

  await stat.getByRole('button', { name: 'Close' }).click()
  await expect(stat).not.toContainText('before it will sprout')
})

test('the rain chart can be moved back through the season and returned', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  const chart = page.getByTestId('rain-chart')

  // Back only becomes available once this season's archive has arrived and
  // widened the window past the forecast call's own fourteen days.
  const back = chart.getByRole('button', { name: 'Back 14 days' })
  await expect(back).toBeEnabled()

  // It opens around today, not at the far end of whatever data arrived.
  const opening = await chart.locator('.sub').textContent()
  await expect(chart).toContainText('forecast')

  await back.click()
  await expect(chart.locator('.sub')).not.toHaveText(opening ?? '')

  await chart.getByRole('button', { name: 'Back to today' }).click()
  await expect(chart.locator('.sub')).toHaveText(opening ?? '')
})

test('the chart will not scroll past the end of the forecast', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  const chart = page.getByTestId('rain-chart')
  const forward = chart.getByRole('button', { name: /^Forward/ })

  for (let i = 0; i < 6; i++) if (await forward.isEnabled()) await forward.click()
  await expect(forward).toBeDisabled()
})

test('choosing a theme repaints the app and survives a reload', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await goToTab(page, 'Settings')

  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-theme', 'dusk')

  await page.getByRole('radio', { name: /Dusk/ }).click()
  await expect(html).toHaveAttribute('data-theme', 'dusk')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dusk')
})

test('every section is reachable, and the unbuilt ones say what they will be', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)

  for (const [label, milestone] of [['Soil', 2], ['Crops', 3], ['Harvest', 4]] as const) {
    await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
    const soon = page.getByTestId('soon')
    await expect(soon).toContainText(`Milestone ${milestone}`)
    await expect(soon).toContainText('Not built yet')
  }
})

test('About says what Kurima cannot do, not only what it can', async ({ page }) => {
  await fakeOpenMeteo(page)
  await page.goto('/#about')
  const about = page.locator('.prose')
  await expect(about).toContainText('What it cannot do')
  await expect(about).toContainText('Guidance only')
})

test('opening one popover closes the other', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)

  // A menu, then an explanation: the menu must give way.
  await page.getByTestId('crop-menu').click()
  await expect(page.getByRole('listbox')).toBeVisible()
  const stat = page.locator('.stat').filter({ hasText: 'rain already fallen' })
  await stat.getByRole('button').click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(stat).toContainText('before it will sprout')

  // And an explanation, then a menu: the explanation must give way.
  await page.getByTestId('district-menu').click()
  await expect(stat).not.toContainText('before it will sprout')
})

test('tapping away from an explanation dismisses it', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  const stat = page.locator('.stat').filter({ hasText: 'rain already fallen' })
  await stat.getByRole('button').click()
  await expect(stat).toContainText('before it will sprout')
  await page.locator('h1').click()
  await expect(stat).not.toContainText('before it will sprout')
})
