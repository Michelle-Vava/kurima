// Fake Open-Meteo responses, shaped like the real API but with rain we choose.
// Dates are built around the device's local "today", because the app judges a
// forecast's age by comparing its "today" with the device date.

import type { Page } from '@playwright/test'

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
  const time = dateRange(new Date(1991, 0, 1, 12), 30 * 365 + 7) // through 2020-12-31 (7 leap days)
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

export interface FakeWeather {
  forecast?: ReturnType<typeof forecastResponse>
  history?: ReturnType<typeof historyResponse>
  seasonal?: ReturnType<typeof seasonalResponse>
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
  await page.route(/^https:\/\/archive-api\.open-meteo\.com\//, (route) =>
    route.fulfill(json(fake.history ?? historyResponse())),
  )
  await page.route(/^https:\/\/seasonal-api\.open-meteo\.com\//, (route) =>
    route.fulfill(json(fake.seasonal ?? seasonalResponse())),
  )
  await page.route(/^https:\/\/geocoding-api\.open-meteo\.com\//, (route) => route.fulfill(json({ results: [] })))
}

/** Pick the Harare sample town from the quick-pick chips. */
export async function pickHarare(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Harare, Zimbabwe' }).click()
  await page.getByRole('heading', { name: 'Harare' }).waitFor()
}
