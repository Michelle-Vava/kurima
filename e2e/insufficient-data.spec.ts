import { expect, test } from '@playwright/test'
import { daysFromToday, fakeOpenMeteo, forecastResponse, pickHarare } from './fixtures.ts'

test('a short forecast gives "not enough data", never "plant"', async ({ page }) => {
  await fakeOpenMeteo(page, {
    // 23 mm just fell, but only 3 days of forecast: a 7-day dry spell cannot be ruled out.
    forecast: forecastResponse({ past: [2, 9, 8, 6], forecastDays: 3, forecast: [1, 1, 1] }),
  })
  await pickHarare(page)

  const signal = page.locator('[data-signal]')
  await expect(signal).toHaveAttribute('data-signal', 'unknown')
  await expect(signal.getByRole('heading', { level: 2 })).toHaveText('Not enough data')
  await expect(signal).toContainText('Only 3 days of forecast')
  await expect(signal).not.toContainText('Good time to plant')
})

test('an empty forecast gives "not enough data"', async ({ page }) => {
  await fakeOpenMeteo(page, { forecast: forecastResponse({ past: [2, 9, 8, 6], forecastDays: 0 }) })
  await pickHarare(page)
  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'unknown')
})

test('a forecast older than a day hides the recommendation and says how old it is', async ({ page }) => {
  const fiveDaysAgo = daysFromToday(-5)
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ today: fiveDaysAgo, past: [2, 9, 8, 6], forecast: [3, 3, 3, 3, 3, 3, 3, 3] }),
  })
  await pickHarare(page)

  const stale = page.getByTestId('stale')
  await expect(stale).toContainText('This forecast is 5 days old')
  await expect(stale).toContainText('reopen the app to refresh')
  await expect(page.locator('[data-signal]')).toHaveCount(0)
  await expect(page.getByTestId('rain-chart')).toHaveCount(0)
  // Climate information does not go stale and is still shown.
  await expect(page.getByRole('heading', { name: /Normal rainfall here/ })).toBeVisible()
})

test("yesterday's forecast is still used, with its age shown", async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ today: daysFromToday(-1), past: [2, 9, 8, 6], forecast: [3, 3, 3, 3, 3, 3, 3, 3] }),
  })
  await pickHarare(page)
  await expect(page.locator('[data-signal]')).toContainText('(1 day old)')
  await expect(page.getByTestId('stale')).toHaveCount(0)
})
