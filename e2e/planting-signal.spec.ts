import { expect, test } from '@playwright/test'
import { fakeOpenMeteo, forecastResponse, historyResponse, pickHarare } from './fixtures.ts'

const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2, 4, 0, 2, 3, 1, 2] // never 7 dry days in a row

test('a farmer picks a sample town and gets a plant answer', async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ past: [0, 0, 0, 0, 2, 9, 8, 6], forecast: showers }), // 23 mm in the last 3 days
  })
  await pickHarare(page)

  const signal = page.locator('[data-signal]')
  await expect(signal).toHaveAttribute('data-signal', 'plant')
  await expect(signal.getByRole('heading', { level: 2 })).toHaveText('Good time to plant')
  await expect(signal).toContainText('23 mm fell within 3 days')
  await expect(signal).toContainText('Forecast issued')
  await expect(signal).toContainText('(today)')

  await expect(page.getByTestId('rain-chart')).toContainText('modelled')
  await expect(page.getByTestId('rain-chart')).not.toContainText('observed')
  await expect(page.getByTestId('outlook')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Normal rainfall here/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Use my location/ })).toHaveCount(0)
})

test("today's rain does not count as already fallen", async ({ page }) => {
  // 25 mm today, nothing before: with today in the forecast this is "wait", not "plant".
  await fakeOpenMeteo(page, { forecast: forecastResponse({ past: [], forecast: [25, ...showers] }) })
  await pickHarare(page)
  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'wait')
  await expect(page.locator('[data-signal]')).toContainText('Wait for it to fall before planting')
})

test('a dry season shows no outlook percentages', async ({ page }) => {
  await fakeOpenMeteo(page, { history: historyResponse(0) })
  await pickHarare(page)
  await expect(page.getByTestId('outlook-dry')).toContainText('Dry season here')
  await expect(page.getByTestId('outlook')).toHaveCount(0)
  await expect(page.locator('[data-signal]')).toContainText('outside the usual rainy season')
})
