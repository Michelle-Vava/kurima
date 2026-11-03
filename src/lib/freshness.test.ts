import { describe, expect, it } from 'vitest'
import { MAX_WEATHER_AGE_DAYS, ageInDays, isTooOld, localIsoDate } from './freshness'

const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0)

describe('localIsoDate', () => {
  it('formats in local time with zero padding', () => {
    expect(localIsoDate(noon(2026, 11, 2))).toBe('2026-11-02')
    expect(localIsoDate(new Date(2026, 0, 9, 0, 0, 1))).toBe('2026-01-09')
  })
})

describe('ageInDays', () => {
  it('is 0 for a forecast issued today', () => {
    expect(ageInDays('2026-11-02', noon(2026, 11, 2))).toBe(0)
  })
  it('counts whole days', () => {
    expect(ageInDays('2026-11-01', noon(2026, 11, 2))).toBe(1)
    expect(ageInDays('2026-10-28', noon(2026, 11, 2))).toBe(5)
  })
  it('crosses month and year boundaries', () => {
    expect(ageInDays('2025-12-31', noon(2026, 1, 1))).toBe(1)
  })
  it('never goes negative when the place is a day ahead of the device', () => {
    expect(ageInDays('2026-11-03', noon(2026, 11, 2))).toBe(0)
  })
  it('treats a missing date as fresh rather than crashing', () => {
    expect(ageInDays('', noon(2026, 11, 2))).toBe(0)
  })
})

describe('isTooOld', () => {
  it('hides the recommendation from the threshold onwards', () => {
    const now = noon(2026, 11, 2)
    expect(isTooOld('2026-11-02', now)).toBe(false)
    expect(isTooOld('2026-11-01', now)).toBe(false)
    expect(isTooOld('2026-10-31', now)).toBe(MAX_WEATHER_AGE_DAYS <= 2)
    expect(isTooOld('2026-10-20', now)).toBe(true)
  })
})
