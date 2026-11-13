import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfSeason,
  daysBetween,
  onsetDates,
  onsetStats,
  rainToDate,
  rainToDateByYear,
  rankAmong,
  scanOnsets,
  seasonStartMonth,
  seasonYearOf,
  typicalOnset,
} from './season'

const HARARE_NORMALS = [215.2, 144.4, 92.7, 27.5, 6.3, 1.7, 1.2, 0.7, 3.2, 21.3, 78.5, 178.7]
const KANO_NORMALS = [0, 0, 0, 4, 30, 68, 155, 240, 115, 21, 0, 0]

describe('seasonStartMonth', () => {
  it('is the driest month, so the search always crosses one rainy season', () => {
    expect(seasonStartMonth(HARARE_NORMALS)).toBe(8) // August
    expect(seasonStartMonth(KANO_NORMALS)).toBe(1) // January
  })
})

describe('season dates', () => {
  it('names a season by the year its start month fell in', () => {
    expect(seasonYearOf('2017-11-12', 8)).toBe(2017)
    expect(seasonYearOf('2018-01-26', 8)).toBe(2017) // January belongs to the season that began the August before
    expect(seasonYearOf('2018-08-01', 8)).toBe(2018)
  })
  it('counts days from the first of the start month', () => {
    expect(dayOfSeason('2017-08-01', 8)).toBe(0)
    expect(dayOfSeason('2017-11-27', 8)).toBe(118)
    expect(dayOfSeason('2018-01-01', 8)).toBe(153)
  })
  it('adds and subtracts days across month and year ends', () => {
    expect(addDays('2017-08-01', 118)).toBe('2017-11-27')
    expect(addDays('2018-01-01', -1)).toBe('2017-12-31')
    expect(daysBetween('2026-11-04', '2026-11-27')).toBe(23)
    expect(daysBetween('2026-11-27', '2026-11-04')).toBe(-23)
  })
})

/** Build a daily series with 0 mm everywhere except the given dates. */
function series(from: string, to: string, rain: Record<string, number>) {
  const time: string[] = []
  const values: number[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    time.push(d)
    values.push(rain[d] ?? 0)
  }
  return { time, values }
}

describe('onsetDates', () => {
  it('finds the first onset rain that was not followed by a dry spell', () => {
    const s = series('2000-08-01', '2002-07-31', {
      // Season 2000: a false start on 1 Nov (dry spell after), the real start on 20 Nov.
      '2000-11-01': 25,
      '2000-11-20': 25, '2000-11-24': 5, '2000-11-28': 5, '2000-12-02': 5, '2000-12-06': 5, '2000-12-10': 5,
      // Season 2001: starts 5 Dec.
      '2001-12-05': 12, '2001-12-06': 10, '2001-12-10': 5, '2001-12-14': 5, '2001-12-18': 5, '2001-12-22': 5, '2001-12-26': 5,
    })
    expect(onsetDates(s, 8)).toEqual([
      { seasonYear: 2000, date: '2000-11-20' },
      { seasonYear: 2001, date: '2001-12-06' },
    ])
  })
  it('skips a season the record does not fully cover', () => {
    const s = series('2000-09-01', '2001-07-31', { '2000-11-20': 25, '2000-11-24': 5, '2000-11-28': 5, '2000-12-02': 5, '2000-12-06': 5, '2000-12-10': 5 })
    expect(onsetDates(s, 8)).toEqual([]) // season 2000 began on 1 Aug, before the record
  })
  it('leaves out a season where the rains never properly broke', () => {
    const s = series('2000-08-01', '2001-07-31', { '2000-11-01': 25 }) // one storm, then nothing
    expect(onsetDates(s, 8)).toEqual([])
  })
})

describe('onsetStats and typicalOnset', () => {
  // Onsets on 10 Nov, 13 Nov, ... 10 Dec across eleven seasons.
  const dates = Array.from({ length: 11 }, (_, i) => dayOfSeason(addDays('2000-11-10', i * 3), 8))
  it('needs at least ten seasons', () => {
    expect(onsetStats(dates.slice(0, 9), 8)).toBeNull()
    expect(onsetStats(dates, 8)).not.toBeNull()
  })
  it('places the usual onset in the current season and counts the days to it', () => {
    const stats = onsetStats(dates, 8)!
    expect(stats.seasons).toBe(11)
    // Median of 10 Nov, 13 Nov, ... 10 Dec is 25 Nov.
    const t = typicalOnset(stats, '2026-11-04')
    expect(t.date).toBe('2026-11-25')
    expect(t.daysAway).toBe(21)
    expect(t.from < t.date && t.date < t.to).toBe(true)
  })
  it('goes negative once the usual date has passed', () => {
    const stats = onsetStats(dates, 8)!
    expect(typicalOnset(stats, '2026-12-10').daysAway).toBeLessThan(0)
  })
  it('still belongs to the right season in January', () => {
    const stats = onsetStats(dates, 8)!
    expect(typicalOnset(stats, '2027-01-15').date).toBe('2026-11-25')
  })
})

describe('season so far', () => {
  it('totals each past season up to the same day', () => {
    const s = series('2000-08-01', '2002-07-31', { '2000-09-01': 10, '2000-10-01': 10, '2001-09-01': 30, '2001-12-01': 99 })
    const doy = dayOfSeason('2000-10-15', 8)
    expect(rainToDateByYear(s, 8, doy)).toEqual([20, 30]) // the 99 on 1 Dec is after the cut-off
  })
  it('ranks this season among past ones', () => {
    const past = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(rankAmong(55, past)).toBe(0.5)
    expect(rankAmong(5, past)).toBe(0)
    expect(rankAmong(500, past)).toBe(1)
    expect(rankAmong(55, past.slice(0, 5))).toBeNull()
  })
})

describe('holes in the record', () => {
  // The onset is 20 Nov; the record is otherwise complete across two seasons.
  const WET = {
    '2000-11-20': 25, '2000-11-24': 5, '2000-11-28': 5, '2000-12-02': 5, '2000-12-06': 5, '2000-12-10': 5,
    '2001-11-20': 25, '2001-11-24': 5, '2001-11-28': 5, '2001-12-02': 5, '2001-12-06': 5, '2001-12-10': 5,
  }
  const full = series('2000-08-01', '2002-07-31', WET)
  const without = (dates: string[]) => {
    const drop = new Set(dates)
    const keep = full.time.map((d) => !drop.has(d))
    return { time: full.time.filter((_, i) => keep[i]), values: full.values.filter((_, i) => keep[i]) }
  }
  const blanked = (dates: string[]) => {
    const blank = new Set(dates)
    return { time: full.time, values: full.values.map((v, i) => (blank.has(full.time[i]) ? null : v)) }
  }

  it('reads both seasons when the record is whole', () => {
    expect(scanOnsets(full, 8)).toEqual({
      dates: [{ seasonYear: 2000, date: '2000-11-20' }, { seasonYear: 2001, date: '2001-11-20' }],
      withoutOnset: 0,
      incomplete: 0,
    })
    expect(rainToDate(full, 8, 120)).toEqual({ totals: [35, 35], incomplete: 0 })
  })

  it('sets a season aside rather than reading a hole as a dry day', () => {
    // Blank the onset rain itself. The old code read null as 0 mm and moved
    // the season's onset later; now the season is declared unjudgeable.
    const s = blanked(['2000-11-20'])
    const scan = scanOnsets(s, 8)
    expect(scan.dates).toEqual([{ seasonYear: 2001, date: '2001-11-20' }])
    expect(scan.incomplete).toBe(1)
    expect(scan.withoutOnset).toBe(0)
  })

  it('does not blame the weather for a gap in the data', () => {
    // The distinction that matters: "the rains never came" is a fact about
    // the season, "we could not tell" is a fact about the archive.
    // Three extra weeks on the end so the last season has its hindsight and
    // is judged on the weather rather than on where the record stops.
    const dry = series('2000-08-01', '2002-08-21', {})
    expect(scanOnsets(dry, 8)).toMatchObject({ withoutOnset: 2, incomplete: 0 })
    expect(scanOnsets(blanked(['2000-11-20']), 8)).toMatchObject({ withoutOnset: 0, incomplete: 1 })
  })

  it('ignores a hole that falls after the onset it already found', () => {
    expect(scanOnsets(blanked(['2001-06-15']), 8).dates).toHaveLength(2)
  })

  it('keeps the rest of the record when one row is missing entirely', () => {
    // A missing row used to shift every later row, so a 120-day window
    // silently spanned 121 days of calendar, or the season vanished.
    const scan = scanOnsets(without(['2000-10-15']), 8)
    expect(scan.dates).toEqual([{ seasonYear: 2001, date: '2001-11-20' }])
    expect(scan.incomplete).toBe(1)
  })

  it('refuses to total a season it cannot total, and says how many', () => {
    // One day short of the window and the old code dropped the season with no
    // trace, so "wetter than 80% of 29 seasons" quietly became 28.
    expect(rainToDate(without(['2000-09-09']), 8, 120)).toEqual({ totals: [35], incomplete: 1 })
    expect(rainToDate(blanked(['2001-10-01']), 8, 120)).toEqual({ totals: [35], incomplete: 1 })
  })

  it('never totals a short season as if it were a full one', () => {
    const { totals } = rainToDate(without(['2000-09-09']), 8, 120)
    expect(totals).toEqual([35]) // never 35 minus a day silently read as dry
  })
})
