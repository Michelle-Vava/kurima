import { describe, expect, it } from 'vitest'
import {
  coverageOf,
  dailyMeans,
  mergeDaily,
  parseArchiveDaily,
  parseArchiveHourly,
  roundAll,
  simField,
  sliceDaily,
  type SimSeries,
} from './era5'

describe('parseArchiveDaily', () => {
  const good = {
    latitude: -17.82,
    longitude: 31.08,
    daily: { time: ['2020-01-01', '2020-01-02'], precipitation_sum: [1.5, null], et0_fao_evapotranspiration: [5, 6] },
  }
  it('pulls out the asked-for fields and nothing else', () => {
    const d = parseArchiveDaily(good, ['precipitation_sum'])
    expect(d.values.precipitation_sum).toEqual([1.5, null])
    expect(d.values.et0_fao_evapotranspiration).toBeUndefined()
    expect(d.latitude).toBe(-17.82)
  })
  it('refuses a failed download saved as text', () => {
    // The data folder really contains one of these:
    // "Unexpected error while streaming data: timeoutReached".
    expect(() => parseArchiveDaily('Unexpected error while streaming data: timeoutReached', ['precipitation_sum'])).toThrow(
      /failed download/,
    )
  })
  it('refuses a field that is missing or the wrong length', () => {
    expect(() => parseArchiveDaily(good, ['snowfall_sum'])).toThrow(/no daily\.snowfall_sum/)
    const ragged = { ...good, daily: { ...good.daily, precipitation_sum: [1.5] } }
    expect(() => parseArchiveDaily(ragged, ['precipitation_sum'])).toThrow(/1 values for 2 days/)
  })
  it('turns anything that is not a finite number into null, not into 0', () => {
    const odd = { ...good, daily: { ...good.daily, precipitation_sum: ['x', NaN] } }
    expect(parseArchiveDaily(odd, ['precipitation_sum']).values.precipitation_sum).toEqual([null, null])
  })
})

describe('parseArchiveHourly', () => {
  it('averages hourly readings into daily means', () => {
    const hours = Array.from({ length: 24 }, (_, h) => `2020-06-01T${String(h).padStart(2, '0')}:00`)
    const raw = { hourly: { time: hours, soil_temperature_0_to_7cm: hours.map((_, h) => h) } }
    expect(parseArchiveHourly(raw, 'soil_temperature_0_to_7cm')).toEqual({ time: ['2020-06-01'], values: [11.5] })
  })
  it('refuses a failed download saved as text', () => {
    expect(() => parseArchiveHourly('timeoutReached', 'soil_temperature_0_to_7cm')).toThrow(/failed download/)
  })
})

describe('dailyMeans', () => {
  const hours = (day: string) => Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, '0')}:00`)
  it('averages a full day of readings', () => {
    const { time, values } = dailyMeans(hours('2020-06-01'), new Array(24).fill(3))
    expect(time).toEqual(['2020-06-01'])
    expect(values).toEqual([3])
  })
  it('gives null, not a part-day mean, when too many hours are missing', () => {
    // An average of only the afternoon is a different quantity with the same
    // name; 5 missing hours is past the limit, 2 is within it.
    const sparse = [...new Array(5).fill(null), ...new Array(19).fill(10)]
    expect(dailyMeans(hours('2020-06-01'), sparse).values).toEqual([null])
    const nearlyFull = [...new Array(2).fill(null), ...new Array(22).fill(10)]
    expect(dailyMeans(hours('2020-06-01'), nearlyFull).values).toEqual([10])
  })
})

describe('mergeDaily', () => {
  it('joins part-records and leaves the hole between them visible', () => {
    const merged = mergeDaily([
      { time: ['2020-01-01', '2020-01-02'], values: [1, 2] },
      { time: ['2020-01-05'], values: [5] },
    ])
    expect(merged.time).toEqual(['2020-01-01', '2020-01-02', '2020-01-03', '2020-01-04', '2020-01-05'])
    expect(merged.values).toEqual([1, 2, null, null, 5])
    expect(coverageOf(merged)).toEqual({ have: 3, want: 5 })
  })
  it('lets the later-listed part win an overlap, so the better source goes last', () => {
    const merged = mergeDaily([
      { time: ['2020-01-01', '2020-01-02'], values: [1, 2] },
      { time: ['2020-01-02'], values: [9] },
    ])
    expect(merged.values).toEqual([1, 9])
  })
  it('does not let a null in the later part erase a reading from the earlier one', () => {
    const merged = mergeDaily([
      { time: ['2020-01-01'], values: [1] },
      { time: ['2020-01-01'], values: [null] },
    ])
    expect(merged.values).toEqual([1])
  })
})

describe('sliceDaily and the simulator shape', () => {
  it('cuts an exact window, padding with null where the record ends', () => {
    const s = sliceDaily({ time: ['2020-01-02', '2020-01-03'], values: [2, 3] }, '2020-01-01', '2020-01-04')
    expect(s.time[0]).toBe('2020-01-01')
    expect(s.values).toEqual([null, 2, 3, null])
  })
  it('rounds for the committed file without touching nulls', () => {
    expect(roundAll([1.2345, null, 2.5], 1)).toEqual([1.2, null, 2.5])
  })
  it('rebuilds dated series from the compact form', () => {
    const sim: SimSeries = {
      place: 'Test',
      latitude: 0,
      longitude: 0,
      from: '2020-02-28',
      to: '2020-03-01',
      rain: [1, 2, 3],
      et0: [4, 5, 6],
      tmaxC: [7, 8, 9],
    }
    const rain = simField(sim, 'rain')
    expect(rain.time).toEqual(['2020-02-28', '2020-02-29', '2020-03-01']) // leap day included
    expect(simField(sim, 'soilTempC')).toEqual({ time: [], values: [] })
  })
})
