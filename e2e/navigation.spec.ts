import { expect, test } from '@playwright/test'
import { KANO, fakeOpenMeteo, geocodeResponse, goToTab, pickDistrict, switchCrop, switchDistrict, usePlace } from './fixtures.ts'

test('moving between screens keeps the chosen district', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Gwanda')
  const place = page.getByTestId('district-menu')

  for (const tab of ['Season', 'Settings', 'Today'] as const) {
    await goToTab(page, tab)
    await expect(place).toBeVisible()
  }
  await expect(page.locator('[data-signal]')).toBeVisible()
})

test('the chosen district survives a reload', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Mutare')
  await page.reload()
  await expect(page.getByTestId('district-menu')).toContainText('Mutare')
  await expect(page.getByTestId('picker')).toHaveCount(0)
})

test('the district is switched from a dropdown, without leaving the answer', async ({ page }) => {
  // Changing district used to mean leaving the screen for a picker page and
  // coming back. The answer must now stay on screen the whole time.
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Gweru')
  await expect(page.locator('[data-signal]')).toBeVisible()
  await switchDistrict(page, 'Masvingo')
  await expect(page.locator('[data-signal]')).toBeVisible()
  await expect(page.getByTestId('picker')).toHaveCount(0)
})

test('switching units converts every screen and is remembered', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await expect(page.locator('[data-signal]')).toContainText('mm')

  await goToTab(page, 'Settings')
  await page.getByTestId('units').getByLabel('Rain').selectOption('in')
  // The planting rule is stored in mm but shown in the chosen unit.
  await expect(page.getByTestId('rule-settings').getByLabel('Onset rain needed')).toHaveValue('0.79')

  await goToTab(page, 'Today')
  await expect(page.locator('[data-signal]')).toContainText(' in')
  await expect(page.getByTestId('rain-chart')).toContainText(' in')

  await page.reload()
  await expect(page.locator('[data-signal]')).toContainText(' in')
})

test('a place outside Zimbabwe says the advice is not checked there', async ({ page }) => {
  await fakeOpenMeteo(page, { geocode: geocodeResponse([KANO]) })
  await usePlace(page, KANO)

  await expect(page.getByTestId('not-checked')).toContainText('has not been checked for Nigeria yet')
})

test('the tab is kept in the URL so a reload stays put', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await goToTab(page, 'Season')
  expect(page.url()).toContain('#season')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Season', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('the crop is named in the answer, and can be changed', async ({ page }) => {
  // "Too dry to plant" begged the question: plant what? Every threshold was
  // derived for maize and the screen never said so.
  await fakeOpenMeteo(page)
  await pickDistrict(page)
  await expect(page.locator('[data-signal] h2')).toContainText('maize')
  await switchCrop(page, 'Sorghum')
  await expect(page.locator('[data-signal] h2')).toContainText('sorghum')
  await page.reload()
  await expect(page.getByTestId('crop-menu')).toContainText('Sorghum')
})
