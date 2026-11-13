// Synthetic daily rainfall for a handful of African rainfall regimes.
//
// Kurima is being validated in Zimbabwe, but almost every piece of season
// logic contains an assumption that only Zimbabwe makes true: that the farming
// year starts in August, that a year holds exactly one rainy season, that
// "wetter than usual" is a meaningful thing to say. Those assumptions are
// cheap to break now and expensive to break after a second country is
// promised. So the regimes below are carried from the start, in unit tests
// and in the end-to-end fakes, even though only the Zimbabwean one is shipped
// as advice.
//
// The numbers are a deliberately crude model — a monthly mean and a wet-day
// frequency, drawn from a seeded generator — not a reanalysis. They are here
// to exercise shape (one peak, two peaks, none; north of the equator, south of
// it), never to make a claim about a real place. Nothing derived from them
// should reach a farmer.

// Imported with explicit .ts extensions: this module is shared with the
// Playwright fixtures, which type-check under nodenext resolution, and it is
// the one file in src/ that both projects compile.
import type { DailySeries } from '../climate.ts'
import { addDays, daysBetween } from '../dates.ts'

export interface ClimateShape {
  key: string
  /** Somewhere real, so the shape is recognisable; the rain is invented. */
  label: string
  countryCode: string
  latitude: number
  longitude: number
  /** Average rain per day in each calendar month, index 0 = January (mm). */
  monthlyMmPerDay: number[]
  /** What this shape is here to break. */
  tests: string
}

export const CLIMATE_SHAPES: ClimateShape[] = [
  {
    key: 'harare',
    label: 'Harare, Zimbabwe',
    countryCode: 'ZW',
    latitude: -17.83,
    longitude: 31.05,
    // One summer season, Nov–Mar; driest in August. The case Kurima is built on.
    monthlyMmPerDay: [6.9, 5.2, 3.0, 0.9, 0.2, 0.06, 0.04, 0.02, 0.1, 0.7, 2.6, 5.8],
    tests: 'the southern-hemisphere single season Kurima is validated on',
  },
  {
    key: 'kano',
    label: 'Kano, Nigeria',
    countryCode: 'NG',
    // One summer season the other way up: Jun–Sep, driest in January. Catches
    // anything that assumes a farming year beginning in August.
    latitude: 12.0,
    longitude: 8.52,
    monthlyMmPerDay: [0, 0, 0.1, 0.5, 2.1, 3.6, 6.4, 8.8, 4.3, 0.7, 0, 0],
    tests: 'a northern-hemisphere season, so the farming year does not start in August',
  },
  {
    key: 'kisumu',
    label: 'Kisumu, Kenya',
    countryCode: 'KE',
    latitude: -0.09,
    longitude: 34.77,
    // Two seasons: long rains Mar–May, short rains Oct–Dec, and no month truly
    // dry. A single "when do the rains break" answer is wrong here, and the
    // point of keeping it is to see Kurima say so rather than average them.
    monthlyMmPerDay: [1.7, 2.3, 4.5, 6.6, 5.2, 2.6, 1.9, 2.4, 2.3, 3.3, 3.6, 2.8],
    tests: 'two rainy seasons a year, which one onset date cannot describe',
  },
  {
    key: 'aswan',
    label: 'Aswan, Egypt',
    countryCode: 'EG',
    latitude: 24.09,
    longitude: 32.9,
    // Effectively no rain at all. Every statistic here should decline to speak.
    monthlyMmPerDay: [0.01, 0, 0.01, 0, 0, 0, 0, 0, 0, 0.01, 0.01, 0.01],
    tests: 'a place with no rainy season, where every season statistic must stay silent',
  },
]

export function shape(key: string): ClimateShape {
  const s = CLIMATE_SHAPES.find((c) => c.key === key)
  if (!s) throw new Error(`no climate shape "${key}"`)
  return s
}

/** Days in a calendar month (1–12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Deterministic daily rain for a shape, `from` to `to` inclusive.
 *
 * Rain falls on a fraction of days rather than a little every day, because a
 * drizzle every day would satisfy "20 mm in 3 days" and never produce a dry
 * spell — the two things the onset rule is made of. Same seed, same series,
 * every run: a test that depends on today's random numbers is not a test.
 */
export function dailyRain(s: ClimateShape, from: string, to: string, seed = 1): DailySeries {
  const rand = lcg(seed + hash(s.key))
  const time: string[] = []
  const values: (number | null)[] = []
  const n = daysBetween(from, to) + 1
  for (let i = 0; i < n; i++) {
    const date = addDays(from, i)
    const month = Number(date.slice(5, 7))
    const mean = s.monthlyMmPerDay[month - 1]
    time.push(date)
    if (mean <= 0) {
      values.push(0)
      continue
    }
    // Wetter months rain on more days as well as harder, up to 2 days in 3.
    const wetProb = Math.min(0.66, 0.08 + mean / 14)
    if (rand() > wetProb) {
      values.push(0)
      continue
    }
    // Exponential falls, so a month's rain arrives in a few storms.
    const perWetDay = mean / wetProb
    values.push(Math.round(-Math.log(1 - rand()) * perWetDay * 10) / 10)
  }
  return { time, values }
}

/** Monthly totals implied by a shape, for comparing against derived normals. */
export function expectedNormals(s: ClimateShape, year = 2001): number[] {
  return s.monthlyMmPerDay.map((mm, i) => mm * daysInMonth(year, i + 1))
}

/** Thirty years of daily rain, 1991–2020, the standard normal period. */
export function thirtyYears(s: ClimateShape, seed = 1): DailySeries {
  return dailyRain(s, '1991-01-01', '2020-12-31', seed)
}

/** Remove whole days from a series, as a patchy archive would. */
export function withGaps(series: DailySeries, dates: string[]): DailySeries {
  const drop = new Set(dates)
  const keep = series.time.map((d) => !drop.has(d))
  return {
    time: series.time.filter((_, i) => keep[i]),
    values: series.values.filter((_, i) => keep[i]),
  }
}

/** Blank out readings without removing the rows, as a source with outages would. */
export function withNulls(series: DailySeries, dates: string[]): DailySeries {
  const blank = new Set(dates)
  return { time: series.time, values: series.values.map((v, i) => (blank.has(series.time[i]) ? null : v)) }
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Park–Miller; small, seeded and the same in every runtime. */
function lcg(seed: number): () => number {
  let state = (seed % 2147483646) + 1
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
