import { expect, test } from '@playwright/test'
import { fakeOpenMeteo, forecastResponse, goToTab, pickDistrict } from './fixtures.ts'

const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2, 4, 0, 2, 3, 1, 2] // 26 mm, no 7-day dry spell
const wetPast = [0, 0, 0, 0, 2, 9, 8, 6] // 23 mm in the last 3 days

test('a thirsty forecast marks a plant answer as marginal without changing it', async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ past: wetPast, forecast: showers, et0PerDay: 7 }), // 112 mm out vs 26 mm in
  })
  await pickDistrict(page)

  const signal = page.locator('[data-signal]')
  await expect(signal).toHaveAttribute('data-signal', 'plant') // verdict unchanged
  await expect(page.getByTestId('cautions')).toContainText('Conditions are marginal')
  await expect(page.getByTestId('cautions')).toContainText('lose')
  await expect(signal).toContainText('rain minus what the sun takes')
})

test('a forecast that keeps pace with the sun raises no caution', async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ past: wetPast, forecast: showers, et0PerDay: 1 }), // 16 mm out vs 26 mm in
  })
  await pickDistrict(page)
  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'plant')
  await expect(page.getByTestId('cautions')).toHaveCount(0)
})

test('cold soil is flagged but does not overturn the answer', async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ past: wetPast, forecast: showers, et0PerDay: 1, soilTempC: 8 }),
  })
  await pickDistrict(page)
  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'plant')
  await expect(page.getByTestId('cautions')).toContainText('too cold')
})

test('the season outlook shows a lean, not a false-precision percentage', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await goToTab(page, 'Season')
  const outlook = page.getByTestId('outlook')
  await expect(outlook).toContainText('Leaning')
  await expect(outlook).toContainText('only which way it leans')
  await expect(outlook).not.toContainText('%')
})
