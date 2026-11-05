import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfSeason,
  daysBetween,
  onsetDates,
  onsetStats,
  rainToDateByYear,
  rankAmong,
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
