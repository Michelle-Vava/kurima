// A daily record laid out on a calendar grid, so that "day N of the season"
// means a date and not a row number.
//
// Why this exists. The archive hands back two parallel arrays, `time` and
// `values`, and it is tempting to treat the row index as the day index. That
// holds only while the record has a row for every single day. One absent row
// and every window computed by slicing rows silently spans an extra calendar
// day; one `null` value and a day with unknown rain is counted as a dry day.
// Neither shows up as an error — the numbers just quietly stop meaning what
// they say. ERA5 over 1991–2020 is in practice complete, so none of this bites
// today; it bites the first time Kurima reads a gappy source, a part-built
// season, or a country we have not tried yet.
//
// So: densify once, address by date, and treat a missing day as *unknown*
// rather than as zero rain.

import type { DailySeries } from './climate'
import { addDays, daysBetween } from './dates'

export interface DenseSeries {
  /** First calendar day covered (YYYY-MM-DD). */
  from: string
  /** Last calendar day covered. */
  to: string
  /** One entry per calendar day from `from` to `to`; null where unknown. */
  mm: (number | null)[]
}

export const EMPTY_DENSE: DenseSeries = { from: '', to: '', mm: [] }

/**
 * Accept either layout. Densifying a thirty-year record costs about 50 ms, so
 * anything that derives several statistics from the same history should
 * densify once and pass the result along rather than hand the raw series to
 * each function in turn.
 */
export function asDense(series: DailySeries | DenseSeries): DenseSeries {
  return 'mm' in series ? series : densify(series)
}

/**
 * Lay a daily series on a continuous calendar grid. Days the record does not
 * mention, and days whose value is null or NaN, both come out as `null`:
 * from here on "no row" and "no reading" are the same thing, which is
 * unknown, which is not the same thing as no rain.
 */
export function densify(series: DailySeries): DenseSeries {
  if (series.time.length === 0) return EMPTY_DENSE
  let from = series.time[0]
  let to = series.time[0]
  for (const d of series.time) {
    if (d < from) from = d
    if (d > to) to = d
  }
  const mm: (number | null)[] = new Array(daysBetween(from, to) + 1).fill(null)
  series.time.forEach((d, i) => {
    const v = series.values[i]
    if (v === null || v === undefined || Number.isNaN(v)) return
    mm[daysBetween(from, d)] = v
  })
  return { from, to, mm }
}

/** Row for a date, or -1 when the date falls outside the record. */
export function indexOf(dense: DenseSeries, date: string): number {
  if (dense.mm.length === 0) return -1
  const i = daysBetween(dense.from, date)
  return i >= 0 && i < dense.mm.length ? i : -1
}

/** Rain on a date: a number, or null when it is outside the record or unknown. */
export function valueOn(dense: DenseSeries, date: string): number | null {
  const i = indexOf(dense, date)
  return i === -1 ? null : dense.mm[i]
}

/** Does the record hold a reading for every day from `from` to `to`? */
export function fullyCovered(dense: DenseSeries, from: string, to: string): boolean {
  const i0 = indexOf(dense, from)
  const i1 = indexOf(dense, to)
  if (i0 === -1 || i1 === -1 || i1 < i0) return false
  for (let i = i0; i <= i1; i++) if (dense.mm[i] === null) return false
  return true
}

/**
 * Days with a reading, and days asked for, between two dates inclusive.
 * Days outside the record count against the total, not for it.
 */
export function coverage(dense: DenseSeries, from: string, to: string): { have: number; want: number } {
  const want = daysBetween(from, to) + 1
  if (want <= 0) return { have: 0, want: Math.max(0, want) }
  let have = 0
  for (let d = 0; d < want; d++) {
    const i = indexOf(dense, addDays(from, d))
    if (i !== -1 && dense.mm[i] !== null) have++
  }
  return { have, want }
}

/** Sum of a date range, or null if any day in it is unknown. */
export function sumRange(dense: DenseSeries, from: string, to: string): number | null {
  const i0 = indexOf(dense, from)
  const i1 = indexOf(dense, to)
  if (i0 === -1 || i1 === -1 || i1 < i0) return null
  let sum = 0
  for (let i = i0; i <= i1; i++) {
    const v = dense.mm[i]
    if (v === null) return null
    sum += v
  }
  return sum
}
