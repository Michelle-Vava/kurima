// The field bar: where, what, and whether it is already in the ground.
//
// These three controls changed what Kurima is willing to say, so they are
// worth holding still: the crop appears in the verdict, telling the app you
// have sown replaces the plant-or-wait answer entirely, and none of it costs
// a screen change.

import { expect, test } from '@playwright/test'
import { fakeOpenMeteo, forecastResponse, pickDistrict, switchCrop } from './fixtures.ts'

const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2, 4, 0, 2, 3, 1, 2] // never 7 dry days in a row
const dry = new Array(16).fill(0)

test('changing crop changes the advice it is about, and is remembered', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await expect(page.locator('[data-signal] h2')).toContainText('maize')

  await switchCrop(page, 'Pearl millet')
  await expect(page.locator('[data-signal] h2')).toContainText('pearl millet')

  await page.reload()
  await expect(page.locator('[data-signal] h2')).toContainText('pearl millet')
})

test('a crop Kurima has not checked says so in the menu', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await page.getByTestId('crop-menu').click()
  const maize = page.getByRole('option', { name: /^Maize/ })
  const sorghum = page.getByRole('option', { name: /^Sorghum/ })
  await expect(maize).not.toContainText('not checked')
  await expect(sorghum).toContainText('not checked')
})

test('saying you have planted replaces the question with the right one', async ({ page }) => {
  await fakeOpenMeteo(page, { forecast: forecastResponse({ forecast: showers }) })
  await pickDistrict(page)
  await expect(page.locator('[data-signal]')).toBeVisible()

  await page.getByRole('button', { name: /I have planted/ }).click()

  // The plant-or-wait verdict is gone: it is no longer the question.
  await expect(page.locator('[data-signal]')).toHaveCount(0)
  const watch = page.locator('[data-crop-watch]')
  await expect(watch).toBeVisible()
  await expect(watch).toContainText('maize')
  await expect(watch).toContainText('days to harvest')
})

test('a dry spell over a young crop is called out, not merely noted', async ({ page }) => {
  await fakeOpenMeteo(page, { forecast: forecastResponse({ forecast: dry }) })
  await pickDistrict(page)
  await page.getByRole('button', { name: /I have planted/ }).click()

  const watch = page.locator('[data-crop-watch]')
  await expect(watch.getByRole('heading', { level: 2 })).toContainText('at risk')
  await expect(watch).toContainText('dry spell is coming')
  // Kurima must not pretend to know whether replanting is right.
  await expect(watch).toContainText('cannot tell you whether to replant')
})

test('a crop past its fragile weeks is not alarmed by the same forecast', async ({ page }) => {
  await fakeOpenMeteo(page, { forecast: forecastResponse({ forecast: dry }) })
  await pickDistrict(page)
  await page.getByRole('button', { name: /I have planted/ }).click()

  const sown = new Date()
  sown.setDate(sown.getDate() - 60)
  await page.locator('.planted-date input').fill(sown.toISOString().slice(0, 10))

  const watch = page.locator('[data-crop-watch]')
  await expect(watch.getByRole('heading', { level: 2 })).not.toContainText('at risk')
})

test('telling Kurima you have not planted after all brings the question back', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await page.getByRole('button', { name: /I have planted/ }).click()
  await expect(page.locator('[data-crop-watch]')).toBeVisible()

  await page.getByRole('button', { name: /Not yet/ }).click()
  await expect(page.locator('[data-signal]')).toBeVisible()
  await expect(page.locator('[data-crop-watch]')).toHaveCount(0)
})
