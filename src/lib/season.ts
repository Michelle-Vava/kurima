// The farming year: when the rains usually break here, and how this season
// compares with the ones before it. Everything comes from the daily history
// Kurima already has; no new data.

import type { DailySeries } from './climate'
import { DEFAULT_RULE, longestDrySpell, maxRollingSum, type OnsetRule } from './onset'

/** How far past the onset rain the dry-spell check looks, with hindsight (days). */
export const HINDSIGHT_DAYS = 21
/** Fewer complete seasons than this and the statistics are not worth showing. */
export const MIN_SEASONS = 10

/**
 * Month (1–12) the farming year starts: the driest month, so that searching
 * forward from it always crosses one rainy season. Harare's driest month is
 * August; Kano's is January. No country has to be hard-coded.
 */
export function seasonStartMonth(normals: number[]): number {
  let driest = 0
  for (let i = 1; i < normals.length; i++) if (normals[i] < normals[driest]) driest = i
  return driest + 1
}

/** The season a date belongs to, named by the calendar year its start month fell in. */
export function seasonYearOf(date: string, startMonth: number): number {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  return m >= startMonth ? y : y - 1
}

/** Days since the first day of the season this date belongs to (0 on that day). */
export function dayOfSeason(date: string, startMonth: number): number {
  return daysBetween(seasonStart(seasonYearOf(date, startMonth), startMonth), date)
}

export function seasonStart(seasonYear: number, startMonth: number): string {
  return `${seasonYear}-${String(startMonth).padStart(2, '0')}-01`
}

/** `start` plus `days`, as YYYY-MM-DD. */
export function addDays(start: string, days: number): string {
  const [y, m, d] = start.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

export interface OnsetDate {
  seasonYear: number
  date: string
}

/**
 * The day the rains broke in each complete past season, judged with hindsight:
 * the first day the onset rain fell (`wetMm` within `wetDays`) that was not
 * followed by a dry spell of `drySpellDays` within the next three weeks.
 * Seasons where no such day exists are left out, as are seasons the record
 * does not fully cover.
 */
export function onsetDates(series: DailySeries, startMonth: number, rule: OnsetRule = DEFAULT_RULE): OnsetDate[] {
  const index = new Map<string, number>()
  series.time.forEach((d, i) => index.set(d, i))
  const values = series.values.map((v) => v ?? 0)
  const first = series.time[0]
  const last = series.time[series.time.length - 1]
  if (!first) return []

  const out: OnsetDate[] = []
  const firstYear = Number(first.slice(0, 4))
  const lastYear = Number(last.slice(0, 4))
  for (let sy = firstYear - 1; sy <= lastYear; sy++) {
    const start = seasonStart(sy, startMonth)
    const end = addDays(seasonStart(sy + 1, startMonth), -1)
    if (start < first || end > last) continue // not a complete season
    const i0 = index.get(start)!
    const i1 = index.get(end)!
    for (let i = i0 + rule.wetDays - 1; i <= i1; i++) {
      const wet = maxRollingSum(values.slice(i - rule.wetDays + 1, i + 1), rule.wetDays)
      if (wet < rule.wetMm) continue
      const after = values.slice(i + 1, i + 1 + HINDSIGHT_DAYS)
      if (after.length < HINDSIGHT_DAYS) break // ran off the record
      if (longestDrySpell(after, rule.dryDayMm) < rule.drySpellDays) {
        out.push({ seasonYear: sy, date: series.time[i] })
        break
      }
    }
  }
  return out
}

export interface OnsetStats {
  startMonth: number
  seasons: number
  /** Day of season, 0-based from the 1st of the start month. */
  medianDoy: number
  q1Doy: number
  q3Doy: number
  earliestDoy: number
  latestDoy: number
}

/** From onset days-of-season (see `dayOfSeason`), one per past season. */
export function onsetStats(onsetDoys: number[], startMonth: number): OnsetStats | null {
  if (onsetDoys.length < MIN_SEASONS) return null
  const doys = [...onsetDoys].sort((a, b) => a - b)
  const at = (p: number) => doys[Math.min(doys.length - 1, Math.floor(p * doys.length))]
  return {
    startMonth,
    seasons: doys.length,
    medianDoy: at(0.5),
    q1Doy: at(0.25),
    q3Doy: at(0.75),
    earliestDoy: doys[0],
    latestDoy: doys[doys.length - 1],
  }
}

export interface TypicalOnset {
  /** The usual onset, placed in the season `today` falls in. */
  date: string
  /** Days from today to that date; negative once it has passed. */
  daysAway: number
  /** The middle half of past seasons, in this season's dates. */
  from: string
  to: string
}

export function typicalOnset(stats: OnsetStats, today: string): TypicalOnset {
  const start = seasonStart(seasonYearOf(today, stats.startMonth), stats.startMonth)
  const date = addDays(start, stats.medianDoy)
  return {
    date,
    daysAway: daysBetween(today, date),
    from: addDays(start, stats.q1Doy),
    to: addDays(start, stats.q3Doy),
  }
}

/**
 * Rain from the start of the season up to and including day `doy`, for each
 * complete past season in the record, oldest first.
 */
export function rainToDateByYear(series: DailySeries, startMonth: number, doy: number): number[] {
  const index = new Map<string, number>()
  series.time.forEach((d, i) => index.set(d, i))
  const values = series.values.map((v) => v ?? 0)
  const out: number[] = []
  const firstYear = Number(series.time[0]?.slice(0, 4))
  const lastYear = Number(series.time[series.time.length - 1]?.slice(0, 4))
  for (let sy = firstYear - 1; sy <= lastYear; sy++) {
    const i0 = index.get(seasonStart(sy, startMonth))
    const i1 = index.get(addDays(seasonStart(sy, startMonth), doy))
    if (i0 === undefined || i1 === undefined) continue
    let sum = 0
    for (let i = i0; i <= i1; i++) sum += values[i]
    out.push(Math.round(sum * 10) / 10)
  }
  return out
}

/** Share of past seasons that had less rain than `value` by this point: 0 is the driest on record, 1 the wettest. */
export function rankAmong(value: number, past: number[]): number | null {
  if (past.length < MIN_SEASONS) return null
  const below = past.filter((p) => p < value).length
  return below / past.length
}
