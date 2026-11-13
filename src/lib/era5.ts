// Reading and reshaping the raw ERA5 downloads in the local data folder.
//
// The folder (see scripts/build-data.ts) is 77 MB of Open-Meteo archive responses,
// fetched once and kept. Nothing in the app, the tests or the future
// simulator reads it: scripts/build-data.ts runs it through the functions
// here and commits the small results. These functions are in src/lib rather
// than in scripts/ because they are the part worth testing, and because the
// Stage 5 simulator will want them from code that runs under vitest.
//
// Everything returned is laid on a calendar grid (see series.ts): one entry
// per day, null where the source has no reading. A raw file that is not what
// it claims to be — the folder contains one, a download that saved an error
// message as JSON — must fail loudly here, not surface as a quiet null.

import type { DailySeries } from './climate.ts'
import { addDays, daysBetween } from './dates.ts'
import { densify } from './series.ts'

/** One daily variable from an Open-Meteo archive response, validated. */
export interface ArchiveDaily {
  latitude: number
  longitude: number
  time: string[]
  /** values[field][i] belongs to time[i]. */
  values: Record<string, (number | null)[]>
}

/**
 * Parse an archive response and pull out the named daily fields.
 * Throws with a plain explanation rather than returning a part-answer: the
 * caller is a build script, and a build that half-works is worse than one
 * that stops.
 */
export function parseArchiveDaily(raw: unknown, fields: string[]): ArchiveDaily {
  const d = asRecord(raw, 'the file is not a JSON object (a failed download saves its error message instead)')
  const daily = asRecord(d.daily, 'no "daily" block')
  const time = daily.time
  if (!Array.isArray(time) || time.length === 0 || typeof time[0] !== 'string') {
    throw new Error('no daily.time array')
  }
  const values: Record<string, (number | null)[]> = {}
  for (const f of fields) {
    const v = daily[f]
    if (!Array.isArray(v)) throw new Error(`no daily.${f}`)
    if (v.length !== time.length) throw new Error(`daily.${f} has ${v.length} values for ${time.length} days`)
    values[f] = v.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : null))
  }
  return {
    latitude: asNumber(d.latitude, 'latitude'),
    longitude: asNumber(d.longitude, 'longitude'),
    time: time as string[],
    values,
  }
}

/** One daily variable from an hourly archive response, averaged per day. */
export function parseArchiveHourly(raw: unknown, field: string): { time: string[]; values: (number | null)[] } {
  const d = asRecord(raw, 'the file is not a JSON object (a failed download saves its error message instead)')
  const hourly = asRecord(d.hourly, 'no "hourly" block')
  const time = hourly.time
  const v = hourly[field]
  if (!Array.isArray(time) || typeof time[0] !== 'string') throw new Error('no hourly.time array')
  if (!Array.isArray(v)) throw new Error(`no hourly.${field}`)
  if (v.length !== time.length) throw new Error(`hourly.${field} has ${v.length} values for ${time.length} hours`)
  return dailyMeans(time as string[], v as (number | null)[])
}

/** Fewer hourly readings than this in a day and its mean is not a daily mean. */
export const MIN_HOURS_PER_DAY = 20

/**
 * Hourly readings to one mean per calendar day. A day missing more than a few
 * hours gets null, not the mean of what happens to be there: an average of
 * only the afternoon is a different quantity wearing the same name.
 */
export function dailyMeans(hourlyTime: string[], values: (number | null)[]): { time: string[]; values: (number | null)[] } {
  const sums = new Map<string, { sum: number; n: number }>()
  const order: string[] = []
  hourlyTime.forEach((t, i) => {
    const day = t.slice(0, 10)
    let s = sums.get(day)
    if (!s) {
      s = { sum: 0, n: 0 }
      sums.set(day, s)
      order.push(day)
    }
    const v = values[i]
    if (typeof v === 'number' && Number.isFinite(v)) {
      s.sum += v
      s.n++
    }
  })
  return {
    time: order,
    values: order.map((day) => {
      const s = sums.get(day)!
      return s.n >= MIN_HOURS_PER_DAY ? s.sum / s.n : null
    }),
  }
}

/**
 * Several part-records of the same variable, one continuous daily series.
 * Parts may abut, overlap or leave holes; a hole stays null rather than
 * closing up, and where two parts both speak for a day the later-listed part
 * wins (list the better source last).
 */
export function mergeDaily(parts: DailySeries[]): DailySeries {
  const kept = parts.filter((p) => p.time.length > 0)
  if (kept.length === 0) return { time: [], values: [] }
  let from = kept[0].time[0]
  let to = from
  for (const p of kept) {
    for (const t of p.time) {
      if (t < from) from = t
      if (t > to) to = t
    }
  }
  const n = daysBetween(from, to) + 1
  const values: (number | null)[] = new Array(n).fill(null)
  for (const p of kept) {
    p.time.forEach((t, i) => {
      const v = p.values[i]
      if (v !== null && v !== undefined && !Number.isNaN(v)) values[daysBetween(from, t)] = v
    })
  }
  return { time: Array.from({ length: n }, (_, i) => addDays(from, i)), values }
}

/** Days with and without a reading, for the build report. */
export function coverageOf(series: DailySeries): { have: number; want: number } {
  const dense = densify(series)
  return { have: dense.mm.filter((v) => v !== null).length, want: dense.mm.length }
}

/** The part of a series between two dates inclusive, on a full grid. */
export function sliceDaily(series: DailySeries, from: string, to: string): DailySeries {
  const dense = densify(series)
  const n = daysBetween(from, to) + 1
  const time: string[] = []
  const values: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i)
    time.push(d)
    const j = daysBetween(dense.from, d)
    values.push(j >= 0 && j < dense.mm.length ? dense.mm[j] : null)
  }
  return { time, values }
}

/** Round to `dp` decimals, leaving null alone. Keeps the committed files small. */
export function roundAll(values: (number | null)[], dp: number): (number | null)[] {
  const k = 10 ** dp
  return values.map((v) => (v === null ? null : Math.round(v * k) / k))
}

/**
 * The compact shape committed for the simulator: one file per place, dates
 * implied by `from` so they are not repeated thirteen thousand times.
 */
export interface SimSeries {
  place: string
  latitude: number
  longitude: number
  /** First day; entry i of every array is `from` plus i days. */
  from: string
  to: string
  /** Daily rain (mm). */
  rain: (number | null)[]
  /** FAO reference evapotranspiration (mm/day). */
  et0: (number | null)[]
  /** Daily maximum temperature (°C). */
  tmaxC: (number | null)[]
  /** Daily mean soil temperature 0–7 cm (°C); only the pilot districts have it. */
  soilTempC?: (number | null)[]
  /** Daily mean soil moisture 0–7 cm (m³/m³). */
  soilMoisture?: (number | null)[]
}

/** Back to the {time, values} shape the rest of src/lib speaks. */
export function simField(s: SimSeries, field: 'rain' | 'et0' | 'tmaxC' | 'soilTempC' | 'soilMoisture'): DailySeries {
  const values = s[field]
  if (!values) return { time: [], values: [] }
  return { time: values.map((_, i) => addDays(s.from, i)), values }
}

function asRecord(v: unknown, complaint: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(complaint)
  return v as Record<string, unknown>
}

function asNumber(v: unknown, name: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`no ${name}`)
  return v
}
