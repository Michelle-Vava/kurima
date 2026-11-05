import { expect, test } from '@playwright/test'
import { KANO, fakeOpenMeteo, forecastResponse, geocodeResponse, goToTab, historyResponse, pickDistrict, searchAndPick } from './fixtures.ts'

const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2, 4, 0, 2, 3, 1, 2] // never 7 dry days in a row

test('a farmer picks a district and gets a plant answer', async ({ page }) => {
  await fakeOpenMeteo(page, {
    forecast: forecastResponse({ past: [0, 0, 0, 0, 2, 9, 8, 6], forecast: showers }), // 23 mm in the last 3 days
  })
  await pickDistrict(page, 'Bindura')

  const signal = page.locator('[data-signal]')
  await expect(signal).toHaveAttribute('data-signal', 'plant')
  await expect(signal.getByRole('heading', { level: 2 })).toHaveText('Good time to plant')
  await expect(signal).toContainText('23 mm fell within 3 days')
  await expect(signal).toContainText('Open-Meteo forecast')
  await expect(signal).toContainText('issued today')

  await expect(page.getByTestId('rain-chart')).toContainText('modelled')
  await expect(page.getByTestId('rain-chart')).not.toContainText('observed')
  await expect(page.getByTestId('not-checked')).toHaveCount(0)

  // From the bundled climate pack: when the rains usually break here.
  await expect(page.getByTestId('season-context')).toContainText('The rains here usually break around')
})

test('the season screen comes from the bundled pack for a pilot district', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Harare')
  await goToTab(page, 'Season')
  await expect(page.getByTestId('normals')).toContainText('bundled with the app')
  await expect(page.getByTestId('normals')).toContainText('1991–2020')
})

test("today's rain does not count as already fallen", async ({ page }) => {
  // 25 mm today, nothing before: with today in the forecast this is "wait", not "plant".
  await fakeOpenMeteo(page, { forecast: forecastResponse({ past: [], forecast: [25, ...showers] }) })
  await pickDistrict(page)
  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'wait')
  await expect(page.locator('[data-signal]')).toContainText('Wait for it to fall before planting')
})

test('a dry season shows no outlook percentages', async ({ page }) => {
  // Pilot districts ship with real climate packs, so a bone-dry fake history
  // only takes effect somewhere without one: Kano, through search.
  await fakeOpenMeteo(page, { history: historyResponse(0), geocode: geocodeResponse([KANO]) })
  await searchAndPick(page, 'Kano', /Kano/)
  await expect(page.locator('[data-signal]')).toContainText('outside the usual rainy season')

  await goToTab(page, 'Season')
  await expect(page.getByTestId('outlook-dry')).toContainText('Dry season here')
  await expect(page.getByTestId('outlook')).toHaveCount(0)
})

test('the season screen shows the outlook and the normals', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await goToTab(page, 'Season')
  await expect(page.getByTestId('outlook')).toBeVisible()
  await expect(page.getByTestId('normals')).toContainText('Normal rainfall here')
  await expect(page.getByTestId('outlook-dry')).toHaveCount(0)
})
