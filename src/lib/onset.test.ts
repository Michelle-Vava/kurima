import { describe, expect, it } from 'vitest'
import { DEFAULT_RULE, evaluateSignal, longestDrySpell, maxRollingSum, plural, splitAtToday } from './onset'

describe('maxRollingSum', () => {
  it('finds the wettest window', () => {
    expect(maxRollingSum([0, 5, 10, 8, 0, 1], 3)).toBe(23)
  })
  it('handles windows longer than the data', () => {
    expect(maxRollingSum([4, 6], 3)).toBe(10)
  })
  it('returns 0 for no data', () => {
    expect(maxRollingSum([], 3)).toBe(0)
  })
})

describe('longestDrySpell', () => {
  it('counts consecutive days under the dry threshold', () => {
    expect(longestDrySpell([0, 0.5, 3, 0, 0, 0, 2], 1)).toBe(3)
  })
  it('is 0 when every day is wet', () => {
    expect(longestDrySpell([2, 3, 4], 1)).toBe(0)
  })
})

describe('evaluateSignal', () => {
  const wetWeek = [0, 0, 0, 2, 9, 8, 6] // 23 mm in the last 3 days
  const showers = [3, 0, 4, 2, 0, 5, 1, 0, 3, 2] // never 7 dry days in a row
  const bone = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  it('says plant after onset rain with no dry spell ahead', () => {
    const r = evaluateSignal({ recentRain: wetWeek, forecastRain: showers, monthNormalMm: 120 })
    expect(r.signal).toBe('plant')
    expect(r.recentWetMm).toBe(23)
  })

  it('says wait when onset rain is followed by a forecast dry spell', () => {
    const r = evaluateSignal({ recentRain: wetWeek, forecastRain: bone, monthNormalMm: 120 })
    expect(r.signal).toBe('wait')
    expect(r.forecastDrySpell).toBe(10)
  })

  it('says wait when it is dry now but heavy rain is forecast', () => {
    const r = evaluateSignal({ recentRain: [0, 0, 0, 0, 0, 0, 0], forecastRain: [0, 12, 10, 4, 1, 2, 3], monthNormalMm: 120 })
    expect(r.signal).toBe('wait')
    expect(r.forecastWetMm).toBe(26)
  })

  it('says dry when there is no rain now or in the forecast', () => {
    expect(evaluateSignal({ recentRain: [0, 0, 0, 0, 0, 0, 0], forecastRain: bone, monthNormalMm: 120 }).signal).toBe('dry')
  })

  it('never says plant outside the rainy season', () => {
    const r = evaluateSignal({ recentRain: wetWeek, forecastRain: showers, monthNormalMm: 10 })
    expect(r.signal).toBe('wait')
    expect(r.reasons[0]).toContain('outside the usual rainy season')
  })

  it('respects a custom local rule', () => {
    const strict = { ...DEFAULT_RULE, wetMm: 30, wetDays: 7 } // the week only had 25 mm
    expect(evaluateSignal({ recentRain: wetWeek, forecastRain: showers, monthNormalMm: 120 }).signal).toBe('plant')
    expect(evaluateSignal({ recentRain: wetWeek, forecastRain: showers, monthNormalMm: 120 }, strict).signal).toBe('dry')
  })
})

describe('splitAtToday', () => {
  it("puts today with the forecast, since today's total includes rain still to come", () => {
    const rain = [1, 2, 3, 40, 5, 6]
    const { recent, forecast } = splitAtToday(rain, 3)
    expect(recent).toEqual([1, 2, 3])
    expect(forecast).toEqual([40, 5, 6])
  })
  it('copes with an index outside the series', () => {
    expect(splitAtToday([1, 2], 5)).toEqual({ recent: [1, 2], forecast: [] })
    expect(splitAtToday([1, 2], -1)).toEqual({ recent: [], forecast: [1, 2] })
  })
})

describe('evaluateSignal with too little data', () => {
  const wetWeek = [0, 0, 0, 2, 9, 8, 6]

  it('never says plant on an empty forecast', () => {
    const r = evaluateSignal({ recentRain: wetWeek, forecastRain: [], monthNormalMm: 120 })
    expect(r.signal).toBe('unknown')
    expect(r.reasons.join(' ')).toContain('0 days of forecast')
  })

  it('needs a forecast at least as long as the dry spell it checks for', () => {
    const sixDays = [3, 3, 3, 3, 3, 3]
    expect(evaluateSignal({ recentRain: wetWeek, forecastRain: sixDays, monthNormalMm: 120 }).signal).toBe('unknown')
    expect(evaluateSignal({ recentRain: wetWeek, forecastRain: [...sixDays, 3], monthNormalMm: 120 }).signal).toBe('plant')
    const shortRule = { ...DEFAULT_RULE, drySpellDays: 5 }
    expect(evaluateSignal({ recentRain: wetWeek, forecastRain: sixDays, monthNormalMm: 120 }, shortRule).signal).toBe('plant')
  })

  it('needs at least the onset window of completed days', () => {
    const r = evaluateSignal({ recentRain: [12, 12], forecastRain: [3, 3, 3, 3, 3, 3, 3], monthNormalMm: 120 })
    expect(r.signal).toBe('unknown')
    expect(r.reasons[0]).toContain('2 completed days')
  })

  it('reports every missing input at once', () => {
    expect(evaluateSignal({ recentRain: [], forecastRain: [], monthNormalMm: 120 }).reasons).toHaveLength(2)
  })
})

describe('plural', () => {
  it('handles one and many', () => {
    expect(plural(1, 'day')).toBe('day')
    expect(plural(0, 'day')).toBe('days')
    expect(plural(7, 'day')).toBe('days')
  })
  it('is used in the dry-spell reason', () => {
    const oneDryDay = [5, 5, 5, 0, 5, 5, 5]
    const r = evaluateSignal({ recentRain: [0, 0, 0, 2, 9, 8, 6], forecastRain: oneDryDay, monthNormalMm: 120 }, { ...DEFAULT_RULE, drySpellDays: 1 })
    expect(r.reasons.join(' ')).toContain('1 dry day in a row')
  })
})
