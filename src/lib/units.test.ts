import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UNITS,
  convertRain,
  convertTemp,
  formatRain,
  formatTemp,
  rainToMm,
  rainUnitLabel,
} from './units'

describe('rain conversion', () => {
  it('leaves millimetres alone', () => {
    expect(convertRain(20, 'mm')).toBe(20)
  })
  it('converts to inches at 25.4 mm each', () => {
    expect(convertRain(25.4, 'in')).toBeCloseTo(1)
    expect(convertRain(20, 'in')).toBeCloseTo(0.7874, 4)
  })
  it('round-trips through rainToMm', () => {
    for (const mm of [0, 0.5, 20, 25, 236.7]) {
      expect(rainToMm(convertRain(mm, 'in'), 'in')).toBeCloseTo(mm, 6)
      expect(rainToMm(convertRain(mm, 'mm'), 'mm')).toBe(mm)
    }
  })
  it('labels the unit', () => {
    expect(rainUnitLabel('mm')).toBe('mm')
    expect(rainUnitLabel('in')).toBe('in')
  })
})

describe('formatRain', () => {
  it('keeps one decimal for small millimetre amounts and none for large', () => {
    expect(formatRain(2.34, 'mm')).toBe('2.3 mm')
    expect(formatRain(9.95, 'mm')).toBe('10 mm') // rounds up past the threshold
    expect(formatRain(23.4, 'mm')).toBe('23 mm')
    expect(formatRain(0, 'mm')).toBe('0 mm')
  })
  it('always gives two decimals in inches, where amounts are fractions', () => {
    expect(formatRain(25.4, 'in')).toBe('1.00 in')
    expect(formatRain(20, 'in')).toBe('0.79 in')
    expect(formatRain(0, 'in')).toBe('0.00 in')
  })
})

describe('temperature', () => {
  it('converts Celsius to Fahrenheit', () => {
    expect(convertTemp(0, 'F')).toBe(32)
    expect(convertTemp(100, 'F')).toBe(212)
    expect(convertTemp(28, 'C')).toBe(28)
  })
  it('formats with the degree symbol', () => {
    expect(formatTemp(28.4, 'C')).toBe('28°C')
    expect(formatTemp(28, 'F')).toBe('82°F')
    expect(formatTemp(-3.2, 'C')).toBe('-3°C')
  })
})

describe('defaults', () => {
  it('are the units the data arrives in', () => {
    expect(DEFAULT_UNITS).toEqual({ rain: 'mm', temp: 'C' })
  })
})
