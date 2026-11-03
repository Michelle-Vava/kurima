// Climate statistics: long-term normals from historical data, and a
// below / near / above normal outlook from a seasonal forecast ensemble.

export interface DailySeries {
  time: string[] // ISO dates, YYYY-MM-DD
  values: (number | null)[]
}

/** Average total rainfall for each calendar month (index 0 = January), in mm. */
export function monthlyNormals(series: DailySeries): number[] {
  const totals = new Map<string, number>() // "YYYY-MM" -> mm
  series.time.forEach((date, i) => {
    const v = series.values[i]
    if (v === null || Number.isNaN(v)) return
    const key = date.slice(0, 7)
    totals.set(key, (totals.get(key) ?? 0) + v)
  })

  const sums = new Array(12).fill(0)
  const counts = new Array(12).fill(0)
  for (const [key, total] of totals) {
    const m = Number(key.slice(5, 7)) - 1
    sums[m] += total
    counts[m] += 1
  }
  return sums.map((s, m) => (counts[m] ? Math.round((s / counts[m]) * 10) / 10 : 0))
}

/**
 * Total rain in each past year for the same calendar window as `months`
 * (e.g. [11, 12, 1] for Nov–Jan). Windows that cross New Year are counted
 * against the year they start in.
 *
 * Only complete seasons are returned: every month of the window must lie
 * inside the record. A record starting 1 Jan 1991 therefore does not produce
 * a "1990" Nov–Jan season made of January alone, which would drag the normal
 * range down.
 */
export function seasonTotalsByYear(series: DailySeries, months: number[]): number[] {
  if (series.time.length === 0 || months.length === 0) return []
  const first = months[0]
  const last = months[months.length - 1]
  const byYear = new Map<number, number>()
  series.time.forEach((date, i) => {
    const v = series.values[i]
    if (v === null || Number.isNaN(v)) return
    const y = Number(date.slice(0, 4))
    const m = Number(date.slice(5, 7))
    if (!months.includes(m)) return
    const seasonYear = m < first ? y - 1 : y
    byYear.set(seasonYear, (byYear.get(seasonYear) ?? 0) + v)
  })

  const recordStart = series.time[0]
  const recordEnd = series.time[series.time.length - 1]
  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .filter((y) => {
      const endYear = last < first ? y + 1 : y
      const seasonStart = `${y}-${pad2(first)}-01`
      const seasonEnd = `${endYear}-${pad2(last)}-${pad2(daysInMonth(endYear, last))}`
      return seasonStart >= recordStart && seasonEnd <= recordEnd
    })
    .map((y) => byYear.get(y)!)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Days in a calendar month (1–12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Below this historical median (mm over the whole window) the window is the
 * dry season: the terciles are a few millimetres apart and a below / near /
 * above split means nothing.
 */
export const DRY_SEASON_WINDOW_MM = 10

export function isDrySeasonWindow(historicalTotals: number[]): boolean {
  if (historicalTotals.length === 0) return false
  return percentile(historicalTotals, 0.5) < DRY_SEASON_WINDOW_MM
}

/** Value below which `p` (0–1) of the sorted data falls, with linear interpolation. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export interface Outlook {
  below: number // probability 0–1
  near: number
  above: number
  normalMm: number // historical median for the window
  forecastMedianMm: number
}

/**
 * Compare each ensemble member's forecast total against historical terciles.
 * Note: model totals are not bias-corrected yet, so treat this as a rough guide.
 */
export function tercileOutlook(historicalTotals: number[], memberTotals: number[]): Outlook {
  const lower = percentile(historicalTotals, 1 / 3)
  const upper = percentile(historicalTotals, 2 / 3)
  let below = 0
  let above = 0
  for (const t of memberTotals) {
    if (t < lower) below++
    else if (t > upper) above++
  }
  const n = memberTotals.length || 1
  return {
    below: below / n,
    above: above / n,
    near: (n - below - above) / n,
    normalMm: Math.round(percentile(historicalTotals, 0.5)),
    forecastMedianMm: Math.round(percentile(memberTotals, 0.5)),
  }
}

/** The next `count` calendar months after the month of `date` (1–12). */
export function nextMonths(date: Date, count: number): number[] {
  const start = date.getMonth() + 1 // 0-based getMonth, so +1 is "next month" in 0-based terms
  return Array.from({ length: count }, (_, i) => ((start + i) % 12) + 1)
}
