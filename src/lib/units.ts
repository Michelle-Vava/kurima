// The farmer's units. Everything is stored and calculated in millimetres and
// degrees Celsius, which is what Open-Meteo returns and what national onset
// rules are written in; units are a display choice applied at the edge.
//
// Weight, area and currency arrive with Milestone 2, when there is a yield or
// a price to convert. Adding them now would mean untested conversions on
// screens that show no such numbers.

export type RainUnit = 'mm' | 'in'
export type TempUnit = 'C' | 'F'

export interface Units {
  rain: RainUnit
  temp: TempUnit
}

export const DEFAULT_UNITS: Units = { rain: 'mm', temp: 'C' }

const MM_PER_INCH = 25.4

export function convertRain(mm: number, unit: RainUnit): number {
  return unit === 'in' ? mm / MM_PER_INCH : mm
}

/** Inches back to millimetres, for reading a threshold a farmer typed in. */
export function rainToMm(value: number, unit: RainUnit): number {
  return unit === 'in' ? value * MM_PER_INCH : value
}

export function rainUnitLabel(unit: RainUnit): string {
  return unit === 'in' ? 'in' : 'mm'
}

/**
 * Rain with its unit. Millimetres get one decimal below 10 and none above,
 * which is the precision the data actually carries; inches always get two,
 * since a useful amount of rain is a fraction of an inch.
 */
export function formatRain(mm: number, unit: RainUnit): string {
  if (unit === 'in') return `${(mm / MM_PER_INCH).toFixed(2)} in`
  return `${Math.abs(mm) < 10 ? Math.round(mm * 10) / 10 : Math.round(mm)} mm`
}

export function convertTemp(celsius: number, unit: TempUnit): number {
  return unit === 'F' ? celsius * 1.8 + 32 : celsius
}

export function formatTemp(celsius: number, unit: TempUnit): string {
  return `${Math.round(convertTemp(celsius, unit))}°${unit}`
}
