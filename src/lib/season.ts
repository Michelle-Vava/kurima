// The farming year: when the rains usually break here, and how this season
// compares with the ones before it. Everything comes from the daily history
// Kurima already has; no new data.

import type { DailySeries } from './climate'
import { addDays, daysBetween } from './dates'
import { DEFAULT_RULE, longestDrySpell, maxRollingSum, type OnsetRule } from './onset'
import { asDense, fullyCovered, indexOf, sumRange, type DenseSeries } from './series'

export { addDays, daysBetween }

/**
 * How far past the onset rain the dry-spell check looks, with hindsight (days).
 *
 * Note that this makes "the rains broke" mean something slightly stricter here
 * than it does in the live answer, which checks whatever forecast exists and
 * so sees at most 16 days. The live rule additionally refuses to say "plant"
 * in a month that normally gets under `offSeasonMonthlyMm`; the historical
 * scan below does not apply that filter, which is why a dry place can show an
 * October onset. Both differences are small for Zimbabwe and neither has been
 * settled.
 */
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

export interface OnsetDate {
  seasonYear: number
  date: string
}

/**
 * What the record was able to say about each past season.
 *
 * `dates` are the seasons that got an answer. The other two counts are the
 * seasons that did not, kept apart because they mean opposite things: a
 * season with *no* onset is a fact about the weather, and a season the record
 * cannot judge is a fact about the data. Lumping them together is how a
 * patchy archive comes to look like a run of failed rainy seasons.
 */
export interface OnsetScan {
  dates: OnsetDate[]
  /** Complete seasons in the record where the rains never met the rule. */
  withoutOnset: number
  /** Seasons set aside because the record has holes where the answer would be. */
  incomplete: number
}

/**
 * The day the rains broke in each past season, judged with hindsight: the
 * first day the onset rain fell (`wetMm` within `wetDays`) that was not
 * followed by a dry spell of `drySpellDays` within the next three weeks.
 *
 * A day with no reading is unknown, not dry. Any candidate day whose onset
 * window or three weeks of hindsight touch an unknown day cannot be judged
 * and is skipped; if a season runs out of candidates having skipped one, the
 * season is reported `incomplete` rather than as a season with no onset.
 */
export function scanOnsets(series: DailySeries | DenseSeries, startMonth: number, rule: OnsetRule = DEFAULT_RULE): OnsetScan {
  const dense = asDense(series)
  if (dense.mm.length === 0) return { dates: [], withoutOnset: 0, incomplete: 0 }

  const dates: OnsetDate[] = []
  let withoutOnset = 0
  let incomplete = 0

  const firstYear = Number(dense.from.slice(0, 4))
  const lastYear = Number(dense.to.slice(0, 4))
  for (let sy = firstYear - 1; sy <= lastYear; sy++) {
    const start = seasonStart(sy, startMonth)
    const end = addDays(seasonStart(sy + 1, startMonth), -1)
    if (start < dense.from || end > dense.to) continue // the record does not reach across this season

    let found: string | null = null
    let blind = false // a day we could not judge, so an earlier onset may be hidden
    const lastDay = daysBetween(start, end)
    for (let d = rule.wetDays - 1; d <= lastDay; d++) {
      const day = addDays(start, d)
      const wetFrom = addDays(day, -(rule.wetDays - 1))
      const afterFrom = addDays(day, 1)
      const afterTo = addDays(day, HINDSIGHT_DAYS)
      if (afterTo > dense.to) {
        blind = true // no three weeks of hindsight left: the rest of the season is unjudgeable
        break
      }
      if (!fullyCovered(dense, wetFrom, day) || !fullyCovered(dense, afterFrom, afterTo)) {
        blind = true
        continue
      }
      const wet = maxRollingSum(window(dense, wetFrom, day), rule.wetDays)
      if (wet < rule.wetMm) continue
      if (longestDrySpell(window(dense, afterFrom, afterTo), rule.dryDayMm) < rule.drySpellDays) {
        found = day
        break
      }
    }

    // A date found after skipping a day we could not judge is not "the first
    // day the rains broke", only the first we could see. That is a late bias,
    // and a biased date is worse than an absent one, so the season is set
    // aside either way.
    if (blind) incomplete++
    else if (found) dates.push({ seasonYear: sy, date: found })
    else withoutOnset++
  }
  return { dates, withoutOnset, incomplete }
}

/** Just the seasons that got an answer. See `scanOnsets` for the ones that did not. */
export function onsetDates(series: DailySeries | DenseSeries, startMonth: number, rule: OnsetRule = DEFAULT_RULE): OnsetDate[] {
  return scanOnsets(series, startMonth, rule).dates
}

/** Readings for a fully covered date range, as plain numbers. */
function window(dense: DenseSeries, from: string, to: string): number[] {
  const i0 = indexOf(dense, from)
  const n = daysBetween(from, to) + 1
  const out = new Array<number>(n)
  for (let k = 0; k < n; k++) out[k] = dense.mm[i0 + k] as number
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
 * past season the record covers in full over that stretch, oldest first.
 *
 * A season is counted only when every day from its start to day `doy` has a
 * reading. Summing around a hole would compare this season's 120 days against
 * a past season's 119 and call the difference weather.
 */
export function rainToDateByYear(series: DailySeries | DenseSeries, startMonth: number, doy: number): number[] {
  return rainToDate(series, startMonth, doy).totals
}

export interface RainToDate {
  /** One total per usable past season, oldest first (mm). */
  totals: number[]
  /** Seasons the record reaches but cannot total, because of holes. */
  incomplete: number
}

export function rainToDate(series: DailySeries | DenseSeries, startMonth: number, doy: number): RainToDate {
  const dense = asDense(series)
  if (dense.mm.length === 0) return { totals: [], incomplete: 0 }
  const totals: number[] = []
  let incomplete = 0
  const firstYear = Number(dense.from.slice(0, 4))
  const lastYear = Number(dense.to.slice(0, 4))
  for (let sy = firstYear - 1; sy <= lastYear; sy++) {
    const from = seasonStart(sy, startMonth)
    const to = addDays(from, doy)
    if (from < dense.from || to > dense.to) continue // the record does not reach across this stretch
    const sum = sumRange(dense, from, to)
    if (sum === null) incomplete++
    else totals.push(Math.round(sum * 10) / 10)
  }
  return { totals, incomplete }
}

/** Share of past seasons that had less rain than `value` by this point: 0 is the driest on record, 1 the wettest. */
export function rankAmong(value: number, past: number[]): number | null {
  if (past.length < MIN_SEASONS) return null
  const below = past.filter((p) => p < value).length
  return below / past.length
}
