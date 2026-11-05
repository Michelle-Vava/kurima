import { expect, test } from '@playwright/test'
import { KANO, districtChip, fakeOpenMeteo, geocodeResponse, goToTab, pickDistrict, searchAndPick } from './fixtures.ts'

test('moving between screens keeps the chosen district', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Gwanda')
  const place = page.getByRole('heading', { name: 'Gwanda', level: 2 })

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
  await expect(page.getByRole('heading', { name: 'Mutare', level: 2 })).toBeVisible()
  await expect(page.getByTestId('place-picker')).toHaveCount(0)
})

test('the district can be changed again', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Gweru')
  await page.getByRole('button', { name: 'Change district' }).click()
  await districtChip(page, 'Masvingo').click()
  await expect(page.getByRole('heading', { name: 'Masvingo', level: 2 })).toBeVisible()
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
  await searchAndPick(page, 'Kano', /Kano/)

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

test('recently chosen districts are offered again', async ({ page }) => {
  await fakeOpenMeteo(page)
  await pickDistrict(page, 'Gweru')
  await page.getByRole('button', { name: 'Change district' }).click()
  await districtChip(page, 'Masvingo').click()
  await page.getByRole('button', { name: 'Change district' }).click()
  const recent = page.getByTestId('recent')
  await expect(recent).toContainText('Masvingo')
  await expect(recent).toContainText('Gweru')
  // Most recent first.
  await expect(recent.locator('.chip').first()).toContainText('Masvingo')
})
