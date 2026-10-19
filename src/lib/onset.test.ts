import { describe, expect, it } from 'vitest'
import { DEFAULT_RULE, evaluateSignal, longestDrySpell, maxRollingSum } from './onset'

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
    const r = evaluateSignal(wetWeek, showers, 120)
    expect(r.signal).toBe('plant')
    expect(r.recentWetMm).toBe(23)
  })

  it('says wait when onset rain is followed by a forecast dry spell', () => {
    const r = evaluateSignal(wetWeek, bone, 120)
    expect(r.signal).toBe('wait')
    expect(r.forecastDrySpell).toBe(10)
  })

  it('says wait when it is dry now but heavy rain is forecast', () => {
    const r = evaluateSignal([0, 0, 0, 0, 0, 0, 0], [0, 12, 10, 4, 1, 2, 3], 120)
    expect(r.signal).toBe('wait')
    expect(r.forecastWetMm).toBe(26)
  })

  it('says dry when there is no rain now or in the forecast', () => {
    expect(evaluateSignal([0, 0, 0, 0, 0, 0, 0], bone, 120).signal).toBe('dry')
  })

  it('never says plant outside the rainy season', () => {
    const r = evaluateSignal(wetWeek, showers, 10)
    expect(r.signal).toBe('wait')
    expect(r.reasons[0]).toContain('outside the usual rainy season')
  })

  it('respects a custom local rule', () => {
    const strict = { ...DEFAULT_RULE, wetMm: 30, wetDays: 7 } // the week only had 25 mm
    expect(evaluateSignal(wetWeek, showers, 120).signal).toBe('plant')
    expect(evaluateSignal(wetWeek, showers, 120, strict).signal).toBe('dry')
  })
})
