// Kurima gives advice in Zimbabwe only, and will for a while. These tests are
// about the other places anyway.
//
// Everything about the season — when the farming year starts, whether there
// is one rainy season or two, whether there is one at all — is derived rather
// than configured, and derivations have a way of being quietly correct only
// for the data they were written against. A regime that breaks an assumption
// costs nothing to test today and costs a rewrite to discover later.
//
// The rainfall shapes come from src/lib/fixtures/climates.ts, the same ones
// the unit tests use. They are synthetic and no figure here is a claim about
// a real place.

import { expect, test } from '@playwright/test'
import { ASWAN, fakeOpenMeteo, forecastResponse, geocodeResponse, goToTab, KANO, KISUMU, usePlace, shapedHistoryResponse } from './fixtures.ts'

const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2, 4, 0, 2, 3, 1, 2]

test('a Sahel town gets a usual onset date, with a farming year that does not start in August', async ({ page }) => {
  await fakeOpenMeteo(page, {
    geocode: geocodeResponse([KANO]),
    history: shapedHistoryResponse('kano'),
    forecast: forecastResponse({ past: [0, 0, 0, 0, 2, 9, 8, 6], forecast: showers }),
  })
  await usePlace(page, KANO)

  const context = page.getByTestId('season-context')
  await expect(context).toContainText('The rains here usually break around')
  // Kano's rains are June to September, so the date must land in the first
  // half of the year — never in Zimbabwe's November window.
  await expect(context).not.toContainText(/usually break around \d+ (Oct|Nov|Dec)/)
  await expect(page.getByTestId('not-checked')).toContainText('has not been checked for Nigeria yet')
})

test('a place with two rainy seasons is told so instead of being given one date', async ({ page }) => {
  // The failure this guards against: one median of two separate onset
  // clusters is a date in the dry gap between them, stated as fact.
  await fakeOpenMeteo(page, {
    geocode: geocodeResponse([KISUMU]),
    history: shapedHistoryResponse('kisumu'),
    forecast: forecastResponse({ past: [0, 0, 0, 0, 2, 9, 8, 6], forecast: showers }),
  })
  await usePlace(page, KISUMU)

  await expect(page.getByTestId('two-seasons')).toContainText('two rainy seasons')
  await expect(page.getByTestId('season-context')).not.toContainText('usually break around')
})

test('a place with no rainy season claims no onset and no outlook', async ({ page }) => {
  await fakeOpenMeteo(page, {
    geocode: geocodeResponse([ASWAN]),
    history: shapedHistoryResponse('aswan'),
    forecast: forecastResponse({ past: [0, 0, 0, 0, 0, 0, 0, 0], forecast: new Array(16).fill(0) }),
  })
  await usePlace(page, ASWAN)

  await expect(page.locator('[data-signal]')).toHaveAttribute('data-signal', 'dry')
  await expect(page.getByTestId('season-context')).not.toContainText('usually break around')

  await goToTab(page, 'Season')
  await expect(page.getByTestId("outlook-dry")).toBeVisible()
})

test('the off-season check reads the local calendar, not Zimbabwe’s', async ({ page }) => {
  // "Not checked here" means the rule is unvalidated, not switched off. Enough
  // rain has fallen to meet the onset threshold; the answer must still be
  // "wait" out of Kano's rainy season, which ends months before Zimbabwe's
  // begins. A rule that hard-coded southern-African months would say "plant".
  test.skip(isSahelRainySeason(), 'the test only means something outside Kano’s June–September rains')
  await fakeOpenMeteo(page, {
    geocode: geocodeResponse([KANO]),
    history: shapedHistoryResponse('kano'),
    forecast: forecastResponse({ past: [0, 0, 0, 0, 2, 9, 8, 6], forecast: showers }),
  })
  await usePlace(page, KANO)

  const signal = page.locator('[data-signal]')
  await expect(signal).toBeVisible()
  await expect(signal).toContainText('outside the usual rainy season')
  await expect(signal).not.toHaveAttribute('data-signal', 'plant')
})

/** Kano's rains run June to September; the device clock decides which it is. */
function isSahelRainySeason(): boolean {
  const month = new Date().getMonth() + 1
  return month >= 6 && month <= 9
}
