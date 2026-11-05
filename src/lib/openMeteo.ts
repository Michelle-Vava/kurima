// Thin client for the free Open-Meteo APIs (no key needed for non-commercial use).
// Weather data: Open-Meteo.com, CC BY 4.0. Historical data: ERA5 (Copernicus).

import type { DailySeries } from './climate'

const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const SEASONAL = 'https://seasonal-api.open-meteo.com/v1/seasonal'
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'

/** ISO 3166-1 alpha-2 codes for African countries and territories. */
export const AFRICA = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ',
  'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG',
  'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO',
  'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW', 'EH', 'RE', 'YT', 'SH',
])

export interface Place {
  name: string
  region?: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  if (query.trim().length < 2) return []
  const url = `${GEOCODE}?name=${encodeURIComponent(query.trim())}&count=20&language=en&format=json`
  const data = await getJson(url, signal)
  return ((data.results ?? []) as any[])
    .filter((r) => AFRICA.has(r.country_code))
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      region: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      latitude: r.latitude,
      longitude: r.longitude,
    }))
}

export interface Weather {
  timezone: string
  /** Index of today in `rain` / `dates`. */
  todayIndex: number
  /** The date (YYYY-MM-DD, local to the place) the forecast was issued for: its "today". */
  issued: string
  dates: string[]
  rain: number[]
  tempMax: number[]
  tempMin: number[]
  /** FAO reference evapotranspiration: how much water the sun and wind take (mm/day). */
  et0: number[]
  /** Highest chance of rain on each day (%). */
  rainProbability: number[]
  /** Daily mean soil temperature at seeding depth, 0–7 cm (°C). */
  soilTempC: (number | null)[]
  /** Latest modelled soil moisture at 9–27 cm, in m³/m³. */
  soilMoisture: number | null
}

/** Last 14 days and the next 16 days at a point. */
export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<Weather> {
  const url =
    `${FORECAST}?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,` +
    `et0_fao_evapotranspiration,precipitation_probability_max,soil_temperature_0_to_7cm_mean` +
    `&hourly=soil_moisture_9_to_27cm&past_days=14&forecast_days=16&timezone=auto`
  const d = await getJson(url, signal)

  const soil: (number | null)[] = d.hourly?.soil_moisture_9_to_27cm ?? []
  const hourTimes: string[] = d.hourly?.time ?? []
  // Hourly times are in the location's local time, so shift "now" to match.
  const nowIso = new Date(Date.now() + (d.utc_offset_seconds ?? 0) * 1000).toISOString().slice(0, 13)
  let soilMoisture: number | null = null
  for (let i = hourTimes.length - 1; i >= 0; i--) {
    if (hourTimes[i].slice(0, 13) <= nowIso && soil[i] !== null) {
      soilMoisture = soil[i]
      break
    }
  }

  const dates: string[] = d.daily.time
  const todayIndex = Math.min(14, Math.max(0, dates.length - 1))
  return {
    timezone: d.timezone,
    todayIndex,
    issued: dates[todayIndex] ?? '',
    dates,
    rain: (d.daily.precipitation_sum as (number | null)[]).map((v) => v ?? 0),
    tempMax: d.daily.temperature_2m_max,
    tempMin: d.daily.temperature_2m_min,
    et0: (d.daily.et0_fao_evapotranspiration as (number | null)[] | undefined)?.map((v) => v ?? 0) ?? [],
    rainProbability: (d.daily.precipitation_probability_max as (number | null)[] | undefined)?.map((v) => v ?? 0) ?? [],
    soilTempC: (d.daily.soil_temperature_0_to_7cm_mean as (number | null)[] | undefined) ?? [],
    soilMoisture,
  }
}

/** Daily rainfall 1991–2020 (the standard 30-year climate normal period). */
export async function fetchHistory(lat: number, lon: number, signal?: AbortSignal): Promise<DailySeries> {
  const key = `kurima:history:${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = readCache<DailySeries>(key)
  if (cached) return cached

  const url =
    `${ARCHIVE}?latitude=${lat}&longitude=${lon}` +
    `&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&timezone=auto`
  const d = await getJson(url, signal)
  const series = { time: d.daily.time, values: d.daily.precipitation_sum }
  writeCache(key, series)
  return series
}

/** Daily rain between two dates from the archive (lags a few days behind today). */
export async function fetchRainBetween(lat: number, lon: number, from: string, to: string, signal?: AbortSignal): Promise<DailySeries> {
  if (from > to) return { time: [], values: [] }
  const url =
    `${ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${from}&end_date=${to}&daily=precipitation_sum&timezone=auto`
  const d = await getJson(url, signal)
  return { time: d.daily?.time ?? [], values: d.daily?.precipitation_sum ?? [] }
}

export interface SeasonalForecast {
  dates: string[]
  /** One daily rain series per ensemble member. */
  members: number[][]
}

/** About six months of daily rainfall from the seasonal ensemble. */
export async function fetchSeasonal(lat: number, lon: number, signal?: AbortSignal): Promise<SeasonalForecast> {
  const url = `${SEASONAL}?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&forecast_days=183&timezone=auto`
  const d = await getJson(url, signal)
  const members = Object.keys(d.daily)
    .filter((k) => k.startsWith('precipitation_sum'))
    .map((k) => (d.daily[k] as (number | null)[]).map((v) => v ?? 0))
  return { dates: d.daily.time, members }
}

/** Each member's total rain over the given calendar months. */
export function memberTotals(forecast: SeasonalForecast, months: number[]): number[] {
  const inWindow = forecast.dates.map((d) => months.includes(Number(d.slice(5, 7))))
  return forecast.members.map((m) => m.reduce((sum, v, i) => (inWindow[i] ? sum + v : sum), 0))
}

async function getJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather service error (${res.status})`)
  const data = await res.json()
  if (data.error) throw new Error(data.reason ?? 'Weather service error')
  return data
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the app still works, it just refetches next time.
  }
}
