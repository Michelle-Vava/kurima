// Plant-or-wait signal based on a rainfall onset rule.
//
// The default follows the common agronomic definition of rainy-season onset:
// enough rain over a few days to wet the soil, and no long dry spell right
// after it that would kill seedlings. Ministries publish their own local
// thresholds (Zimbabwe, for example, uses 20 mm over 3 days or 25 mm in a
// week), so every number here is configurable.

export interface OnsetRule {
  /** Rain needed within `wetDays` days to count as an onset rain (mm). */
  wetMm: number
  /** Window for `wetMm` (days). */
  wetDays: number
  /** A dry spell this long or longer after planting is a risk (days). */
  drySpellDays: number
  /** A day with less rain than this counts as dry (mm). */
  dryDayMm: number
  /** Months with a long-term average below this are outside the rainy season (mm). */
  offSeasonMonthlyMm: number
}

export const DEFAULT_RULE: OnsetRule = {
  wetMm: 20,
  wetDays: 3,
  drySpellDays: 7,
  dryDayMm: 1,
  offSeasonMonthlyMm: 30,
}

export type Signal = 'plant' | 'wait' | 'dry'

export interface SignalResult {
  signal: Signal
  /** Highest rain total over any `wetDays` window in the recent past (mm). */
  recentWetMm: number
  /** Highest rain total over any `wetDays` window in the forecast (mm). */
  forecastWetMm: number
  /** Longest run of dry days in the forecast. */
  forecastDrySpell: number
  reasons: string[]
}

/** Largest sum of any `window` consecutive values. */
export function maxRollingSum(values: number[], window: number): number {
  if (values.length === 0 || window <= 0) return 0
  const w = Math.min(window, values.length)
  let sum = 0
  for (let i = 0; i < w; i++) sum += values[i]
  let best = sum
  for (let i = w; i < values.length; i++) {
    sum += values[i] - values[i - w]
    if (sum > best) best = sum
  }
  return round1(best)
}

/** Longest run of consecutive values below `dryDayMm`. */
export function longestDrySpell(values: number[], dryDayMm: number): number {
  let best = 0
  let run = 0
  for (const v of values) {
    run = v < dryDayMm ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

/**
 * @param recent  Daily rain for the last few days, oldest first, ending today (mm).
 * @param forecast Daily forecast rain starting tomorrow (mm).
 * @param monthNormalMm Long-term average rain for the current month, if known (mm).
 */
export function evaluateSignal(
  recent: number[],
  forecast: number[],
  monthNormalMm: number | null,
  rule: OnsetRule = DEFAULT_RULE,
): SignalResult {
  const recentWetMm = maxRollingSum(recent.slice(-rule.wetDays * 2), rule.wetDays)
  const forecastWetMm = maxRollingSum(forecast, rule.wetDays)
  const forecastDrySpell = longestDrySpell(forecast, rule.dryDayMm)
  const reasons: string[] = []

  const offSeason = monthNormalMm !== null && monthNormalMm < rule.offSeasonMonthlyMm
  const wetEnough = recentWetMm >= rule.wetMm
  const drySpellAhead = forecastDrySpell >= rule.drySpellDays
  const rainComing = forecastWetMm >= rule.wetMm

  if (offSeason) {
    reasons.push(`This month normally gets only ${Math.round(monthNormalMm!)} mm here, so it's outside the usual rainy season.`)
  }

  if (wetEnough) {
    reasons.push(`${recentWetMm} mm fell within ${rule.wetDays} days, which meets the ${rule.wetMm} mm onset threshold.`)
  } else {
    reasons.push(`Only ${recentWetMm} mm in the last ${rule.wetDays} days, below the ${rule.wetMm} mm needed.`)
  }

  if (drySpellAhead) {
    reasons.push(`The forecast shows ${forecastDrySpell} dry days in a row, which could stress new seedlings.`)
  }

  if (!wetEnough && rainComing) {
    reasons.push(`Around ${forecastWetMm} mm is forecast within ${rule.wetDays} days. Wait for it to fall before planting.`)
  }

  let signal: Signal
  if (wetEnough && !drySpellAhead && !offSeason) signal = 'plant'
  else if (wetEnough || rainComing) signal = 'wait'
  else signal = 'dry'

  return { signal, recentWetMm, forecastWetMm, forecastDrySpell, reasons }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
