// Water balance: rain against how fast the sun takes it back.
//
// Rainfall on its own is a poor guide to whether soil is wetting up. Harare on
// 3 November 2026 had 7.5 mm of rain over 14 days against 92.7 mm of reference
// evapotranspiration (ET0) — the ground lost 85 mm net. ET0 is the FAO
// reference figure, in millimetres a day, and Open-Meteo supplies it on the
// same forecast and archive calls Kurima already makes.

import { MARGINAL_WATER_RATIO } from './agronomy'

export interface WaterBalance {
  /** Rain over the window (mm). */
  rainMm: number
  /** Reference evapotranspiration over the window (mm). */
  et0Mm: number
  /** rain − ET0. Negative means the ground lost water. */
  netMm: number
  /** rain ÷ ET0. 1 means rain exactly kept pace with the sun. */
  ratio: number
}

/**
 * Balance over a window. Pairs are taken up to the shorter of the two series,
 * so a forecast with fewer ET0 days than rain days still gives a fair ratio.
 * Returns null when there is nothing to compare.
 */
export function waterBalance(rain: number[], et0: number[]): WaterBalance | null {
  const n = Math.min(rain.length, et0.length)
  if (n === 0) return null
  let rainMm = 0
  let et0Mm = 0
  for (let i = 0; i < n; i++) {
    rainMm += rain[i]
    et0Mm += et0[i]
  }
  return {
    rainMm: round1(rainMm),
    et0Mm: round1(et0Mm),
    netMm: round1(rainMm - et0Mm),
    // No rain and no demand is "kept pace"; demand with no rain is 0.
    ratio: et0Mm === 0 ? (rainMm > 0 ? Infinity : 1) : round2(rainMm / et0Mm),
  }
}

/** Is the ground failing to keep up with the sun by enough to matter? */
export function isMarginal(balance: WaterBalance | null): boolean {
  return balance !== null && balance.ratio < MARGINAL_WATER_RATIO
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
