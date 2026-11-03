import { describe, expect, it } from 'vitest'
import { DRY_SEASON_WINDOW_MM, isDrySeasonWindow, monthlyNormals, nextMonths, percentile, seasonTotalsByYear, tercileOutlook } from './climate'

function series(entries: [string, number][]) {
  return { time: entries.map((e) => e[0]), values: entries.map((e) => e[1]) }
}

describe('monthlyNormals', () => {
  it('averages monthly totals across years', () => {
    const s = series([
      ['2020-01-01', 10], ['2020-01-02', 20], // Jan 2020 = 30
      ['2021-01-01', 50],                     // Jan 2021 = 50
      ['2021-02-01', 7],
    ])
    const n = monthlyNormals(s)
    expect(n[0]).toBe(40)
    expect(n[1]).toBe(7)
    expect(n[5]).toBe(0)
  })
  it('skips missing values', () => {
    expect(monthlyNormals({ time: ['2020-03-01', '2020-03-02'], values: [5, null] })[2]).toBe(5)
  })
})

describe('seasonTotalsByYear', () => {
  it('groups a Nov–Jan season under the year it starts', () => {
    const s = series([
      ['2019-11-01', 10], ['2019-12-01', 10], ['2020-01-01', 10], ['2020-01-31', 0],
      ['2020-11-01', 5], ['2020-12-01', 5], ['2021-01-01', 5], ['2021-01-31', 0],
    ])
    expect(seasonTotalsByYear(s, [11, 12, 1])).toEqual([30, 15])
  })
  it('drops a season the record starts in the middle of', () => {
    const s = series([['2019-12-01', 10], ['2020-01-31', 10], ['2020-11-01', 4], ['2021-01-31', 4]])
    expect(seasonTotalsByYear(s, [11, 12, 1])).toEqual([8])
  })
  it('does not invent a season from the January a record starts with', () => {
    // History starts 1 Jan 1991. For a Nov–Jan window, that January belongs to
    // a "1990" season whose Nov and Dec are missing. It must not count.
    const s = series([
      ['1991-01-01', 50],                       // would be a tiny "1990 season" on its own
      ['1991-11-01', 100], ['1992-01-31', 100], // 1991 season, complete
      ['1992-11-01', 120], ['1993-01-31', 120], // 1992 season, complete
    ])
    expect(seasonTotalsByYear(s, [11, 12, 1])).toEqual([200, 240])
  })
  it('drops a season the record ends in the middle of', () => {
    const s = series([
      ['2019-11-01', 10], ['2020-01-31', 10],
      ['2020-11-01', 99], ['2020-12-31', 99], // record ends before January
    ])
    expect(seasonTotalsByYear(s, [11, 12, 1])).toEqual([20])
  })
  it('keeps a season that ends exactly on the last day of the record', () => {
    const s = series([['2020-10-01', 1], ['2020-11-15', 2], ['2020-12-31', 3]])
    expect(seasonTotalsByYear(s, [10, 11, 12])).toEqual([6])
  })
  it('keeps a within-year window that starts on the first day of the record', () => {
    const s = series([['1991-01-01', 5], ['1991-03-31', 5], ['1992-01-01', 7], ['1992-03-31', 7]])
    expect(seasonTotalsByYear(s, [1, 2, 3])).toEqual([10, 14])
  })
  it('returns nothing for an empty record', () => {
    expect(seasonTotalsByYear({ time: [], values: [] }, [11, 12, 1])).toEqual([])
  })
})

describe('isDrySeasonWindow', () => {
  it('is true when the historical median is near zero (Kano in Nov–Jan)', () => {
    expect(isDrySeasonWindow([0, 0, 1, 2, 0, 3, 0, 0, 5, 0])).toBe(true)
  })
  it('is false for a real rainy season', () => {
    expect(isDrySeasonWindow([300, 420, 510, 280, 390])).toBe(false)
  })
  it('switches exactly at the threshold', () => {
    expect(isDrySeasonWindow([DRY_SEASON_WINDOW_MM - 1])).toBe(true)
    expect(isDrySeasonWindow([DRY_SEASON_WINDOW_MM])).toBe(false)
  })
  it('is false with no history, so nothing is hidden by mistake', () => {
    expect(isDrySeasonWindow([])).toBe(false)
  })
})

describe('percentile', () => {
  it('interpolates', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(percentile([10, 20, 30], 0)).toBe(10)
  })
})

describe('tercileOutlook', () => {
  const history = [100, 200, 300, 400, 500, 600] // terciles at ~266 and ~433

  it('reports mostly below normal for a dry ensemble', () => {
    const o = tercileOutlook(history, [120, 150, 180, 200, 350])
    expect(o.below).toBeCloseTo(0.8)
    expect(o.near).toBeCloseTo(0.2)
    expect(o.above).toBe(0)
  })
  it('probabilities add up to 1', () => {
    const o = tercileOutlook(history, [100, 300, 550, 600])
    expect(o.below + o.near + o.above).toBeCloseTo(1)
  })
})

describe('nextMonths', () => {
  it('wraps around the new year', () => {
    expect(nextMonths(new Date(2026, 9, 19), 3)).toEqual([11, 12, 1]) // from October
    expect(nextMonths(new Date(2026, 11, 1), 2)).toEqual([1, 2])      // from December
  })
})
