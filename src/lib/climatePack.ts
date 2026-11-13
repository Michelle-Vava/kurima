// Everything Kurima derives from thirty years of daily rain, in one object.
//
// For a pilot district this is built once (scripts/build-packs.ts) and shipped
// with the app: about 8 KB instead of the 198 KB of daily history it comes
// from, so the Season screen opens at once and works offline. Anywhere else it
// is built in the browser from the live archive. Same function either way, so
// a pack can never disagree with the live path.

import { monthlyNormals, seasonTotalsByYear, type DailySeries } from './climate'
import { dayOfSeason, rainToDateByYear, scanOnsets, seasonStartMonth } from './season'
import { densify } from './series'

/** Rain-to-date is kept every 5 days, for 240 days from the start of the season. */
export const TO_DATE_STEP_DAYS = 5
export const TO_DATE_STEPS = 48
export const OUTLOOK_WINDOW = 3

export interface Climate {
  period: string
  /** Average rain for each calendar month (index 0 = January), mm. */
  normals: number[]
  /** Month (1–12) the farming year starts: the driest month. */
  startMonth: number
  /** windows[m-1]: each past year's total for the 3-month window starting in month m. */
  windows: number[][]
  /** Day of season the rains broke, one per past season, with the default rule. */
  onsetDoys: number[]
  /** toDate[s]: each past season's rain through day s × 5. */
  toDate: number[][]
  /**
   * How the seasons in the record were accounted for. Optional because packs
   * built before these existed do not carry them; read them through
   * `seasonAudit`, which supplies sane answers for an older pack.
   */
  seasonsWithoutOnset?: number
  seasonsIncomplete?: number
}

/**
 * Where every season the record spans ended up. `withOnset + withoutOnset +
 * incomplete` is the whole record, so a season count that looks low can be
 * explained rather than guessed at.
 *
 * The three tallies are `null` together for a pack built before they were
 * recorded: unknown, which is not zero. Rerun `scripts/build-packs.ts` to
 * fill them in.
 */
export interface SeasonAudit {
  withOnset: number
  withoutOnset: number | null
  incomplete: number | null
  /** Complete seasons the record spans, or null if the pack cannot say. */
  inRecord: number | null
}

export function seasonAudit(c: Climate): SeasonAudit {
  const withOnset = c.onsetDoys.length
  if (c.seasonsWithoutOnset === undefined || c.seasonsIncomplete === undefined) {
    return { withOnset, withoutOnset: null, incomplete: null, inRecord: null }
  }
  return {
    withOnset,
    withoutOnset: c.seasonsWithoutOnset,
    incomplete: c.seasonsIncomplete,
    inRecord: withOnset + c.seasonsWithoutOnset + c.seasonsIncomplete,
  }
}

export function climateFromSeries(series: DailySeries, period = '1991–2020'): Climate {
  const normals = monthlyNormals(series)
  const startMonth = seasonStartMonth(normals)
  const windows = Array.from({ length: 12 }, (_, i) =>
    seasonTotalsByYear(series, Array.from({ length: OUTLOOK_WINDOW }, (_, k) => ((i + k) % 12) + 1)),
  )
  // Thirty years is around 11,000 days: lay it on the calendar grid once and
  // reuse it, rather than once for the onsets and 48 times more below.
  const dense = densify(series)
  const scan = scanOnsets(dense, startMonth)
  const onsetDoys = scan.dates.map((d) => dayOfSeason(d.date, startMonth))
  const toDate = Array.from({ length: TO_DATE_STEPS }, (_, s) => rainToDateByYear(dense, startMonth, s * TO_DATE_STEP_DAYS))
  return {
    period,
    normals,
    startMonth,
    windows,
    onsetDoys,
    toDate,
    seasonsWithoutOnset: scan.withoutOnset,
    seasonsIncomplete: scan.incomplete,
  }
}

/** Past years' totals for the 3-month window that starts with `months[0]`. */
export function windowTotals(c: Climate, months: number[]): number[] {
  return c.windows[months[0] - 1] ?? []
}

/**
 * Past seasons' rain up to the nearest kept day at or before `doy`, and which
 * day that was, so this season can be cut off at the same point for a fair
 * comparison.
 */
export function pastRainToDate(c: Climate, doy: number): { doy: number; totals: number[] } {
  const step = Math.min(TO_DATE_STEPS - 1, Math.max(0, Math.floor(doy / TO_DATE_STEP_DAYS)))
  return { doy: step * TO_DATE_STEP_DAYS, totals: c.toDate[step] ?? [] }
}

export interface ClimatePack extends Climate {
  place: { name: string; latitude: number; longitude: number }
  key: string
  builtAt: string
}

export function packSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
