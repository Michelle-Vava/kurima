// Fake Open-Meteo responses, shaped like the real API but with rain we choose.
// Dates are built around the device's local "today", because the app judges a
// forecast's age by comparing its "today" with the device date.

import { expect, type Page } from '@playwright/test'

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysFromToday(offset: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function dateRange(start: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return isoDate(d)
  })
}

export interface ForecastOptions {
  /** The "today" of the response. Defaults to the device's today. */
  today?: Date
  /** Completed days before today (the real API gives 14). */
  pastDays?: number
  /** Days from today onwards (the real API gives 16). */
  forecastDays?: number
  /** Rain for the completed days, oldest first. Padded with 0 at the start if short. */
  past?: number[]
  /** Rain for today onwards. Padded with 0 at the end if short. */
  forecast?: number[]
  /** Evapotranspiration per day (mm). Same for every day. Omit for none. */
  et0PerDay?: number
  /** Daily mean soil temperature at 0–7 cm (°C). */
  soilTempC?: number
  /** Chance of rain per day (%). */
  rainProbability?: number
}

/** Response for api.open-meteo.com/v1/forecast with past_days=14&forecast_days=16. */
export function forecastResponse(o: ForecastOptions = {}) {
  const today = o.today ?? daysFromToday(0)
  const pastDays = o.pastDays ?? 14
  const forecastDays = o.forecastDays ?? 16
  const start = new Date(today)
  start.setDate(start.getDate() - pastDays)
  const time = dateRange(start, pastDays + forecastDays)

  const past = o.past ?? []
  const forecast = o.forecast ?? []
  const pastPadded = [...new Array(Math.max(0, pastDays - past.length)).fill(0), ...past].slice(-pastDays)
  const forecastPadded = [...forecast, ...new Array(Math.max(0, forecastDays - forecast.length)).fill(0)].slice(0, forecastDays)
  const rain = [...pastPadded, ...forecastPadded]

  return {
    latitude: -17.83,
    longitude: 31.05,
    utc_offset_seconds: 0,
    timezone: 'Africa/Harare',
    daily: {
      time,
      precipitation_sum: rain,
      temperature_2m_max: rain.map(() => 28),
      temperature_2m_min: rain.map(() => 16),
      et0_fao_evapotranspiration: o.et0PerDay === undefined ? rain.map(() => 0) : rain.map(() => o.et0PerDay!),
      precipitation_probability_max: rain.map(() => o.rainProbability ?? 80),
      soil_temperature_0_to_7cm_mean: rain.map(() => o.soilTempC ?? 22),
    },
    hourly: { time: [], soil_moisture_9_to_27cm: [] },
  }
}

/**
 * Response for archive-api.open-meteo.com for 1991-01-01..2020-12-31.
 * `mmPerDay` constant rain gives every month a normal of ~60 mm at 2 mm/day,
 * so every month counts as rainy season; 0 makes everywhere a dry season.
 */
export function historyResponse(mmPerDay = 2) {
  // 1991 through yesterday, so both the thirty-year climate and this season so far are served.
  const start = new Date(1991, 0, 1, 12)
  const days = Math.round((daysFromToday(-1).getTime() - start.getTime()) / 86_400_000) + 1
  const time = dateRange(start, days)
  return {
    timezone: 'Africa/Harare',
    daily: { time, precipitation_sum: time.map(() => mmPerDay) },
  }
}

/** Response for seasonal-api.open-meteo.com: 183 days, three ensemble members. */
export function seasonalResponse(today = daysFromToday(0), mmPerDay = 1) {
  const time = dateRange(today, 183)
  return {
    timezone: 'Africa/Harare',
    daily: {
      time,
      precipitation_sum_member01: time.map(() => mmPerDay),
      precipitation_sum_member02: time.map(() => mmPerDay * 1.5),
      precipitation_sum_member03: time.map(() => mmPerDay * 0.5),
    },
  }
}

export const KANO = { name: 'Kano', country: 'Nigeria', country_code: 'NG', admin1: 'Kano', latitude: 12.0, longitude: 8.52 }

/** Pick a place through the Africa-wide search (needs a geocode fake). */
export async function searchAndPick(page: Page, query: string, resultName: RegExp) {
  await page.goto('/')
  await page.getByText('Somewhere else in Africa').click()
  await page.getByLabel('Search a town or village').fill(query)
  await page.getByRole('listbox').getByRole('button', { name: resultName }).click()
}

/** Results for the Africa-wide search box. */
export function geocodeResponse(places: { name: string; country: string; country_code: string; admin1?: string; latitude: number; longitude: number }[]) {
  return { results: places }
}

export interface FakeWeather {
  forecast?: ReturnType<typeof forecastResponse>
  history?: ReturnType<typeof historyResponse>
  seasonal?: ReturnType<typeof seasonalResponse>
  geocode?: ReturnType<typeof geocodeResponse>
}

/** Intercept every Open-Meteo call so the test never touches the live service. */
export async function fakeOpenMeteo(page: Page, fake: FakeWeather = {}) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  // Playwright tries routes newest-first, so this catch-all goes in first and
  // only sees requests none of the specific fakes below claimed. Anything that
  // reaches it is a test bug: fail loudly rather than hit the live service.
  await page.route(/open-meteo\.com/, (route) => route.abort())
  await page.route(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/, (route) =>
    route.fulfill(json(fake.forecast ?? forecastResponse())),
  )
  // The archive is asked for two ranges: thirty years for the climate (only
  // for places without a bundled pack) and this season so far. Honour the
  // dates in the request, as the real API does, so the second call does not
  // hand back thirty years as "this season".
  await page.route(/^https:\/\/archive-api\.open-meteo\.com\//, (route) => {
    const u = new URL(route.request().url())
    const from = u.searchParams.get('start_date') ?? '0000'
    const to = u.searchParams.get('end_date') ?? '9999'
    const full = fake.history ?? historyResponse()
    const keep = full.daily.time.map((d) => d >= from && d <= to)
    const daily = {
      time: full.daily.time.filter((_, i) => keep[i]),
      precipitation_sum: full.daily.precipitation_sum.filter((_, i) => keep[i]),
    }
    route.fulfill(json({ ...full, daily }))
  })
  await page.route(/^https:\/\/seasonal-api\.open-meteo\.com\//, (route) =>
    route.fulfill(json(fake.seasonal ?? seasonalResponse())),
  )
  await page.route(/^https:\/\/geocoding-api\.open-meteo\.com\//, (route) =>
    route.fulfill(json(fake.geocode ?? { results: [] })),
  )
}

/**
 * A district chip. Chips are labelled "Bindura, Mashonaland Central" but
 * "Harare" where the province shares the district's name, so match on the
 * district name at the start rather than the whole label.
 */
export function districtChip(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`^${name}`) })
}

/** Pick one of the Zimbabwe pilot districts from the chips. */
export async function pickDistrict(page: Page, name = 'Harare') {
  await page.goto('/')
  await districtChip(page, name).click()
  await page.getByRole('heading', { name, level: 2 }).waitFor()
}

/** Move to a tab and wait for it to become current. */
export async function goToTab(page: Page, label: 'Today' | 'Season' | 'Settings') {
  const tab = page.getByRole('button', { name: label, exact: true })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-current', 'page')
}

