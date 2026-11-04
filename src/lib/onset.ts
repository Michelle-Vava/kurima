// Plant-or-wait signal based on a rainfall onset rule, qualified by how fast
// the ground is losing water.
//
// The default follows the common agronomic definition of rainy-season onset:
// enough rain over a few days to wet the soil, and no long dry spell right
// after it that would kill seedlings. Ministries publish their own local
// thresholds (Zimbabwe, for example, uses 20 mm over 3 days or 25 mm in a
// week), so every number here is configurable.

import { LOW_RAIN_PROBABILITY, MAIZE_SOIL_TEMP_MAX_C, MAIZE_SOIL_TEMP_MIN_C } from './agronomy'
import { isMarginal, waterBalance, type WaterBalance } from './water'

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

/** `unknown` means there isn't enough data to give an answer. */
export type Signal = 'plant' | 'wait' | 'dry' | 'unknown'

/**
 * How comfortable the conditions are behind the signal.
 *
 * Deliberately separate from `signal`. Backtesting showed the water balance is
 * too weak on its own to overturn the rainfall rule — at four Zimbabwe
 * districts it catches 7 of 10 bad starts but raises 7 false alarms — so it
 * qualifies the answer instead of changing it. See docs/validation.md.
 */
export type Confidence = 'good' | 'marginal'

export interface SignalInput {
  /** Daily rain for completed days, oldest first, ending yesterday (mm). */
  recentRain: number[]
  /** Daily forecast rain starting today (mm). */
  forecastRain: number[]
  /** Long-term average rain for the current month, if known (mm). */
  monthNormalMm: number | null
  /** Reference evapotranspiration for the same completed days (mm). */
  recentEt0?: number[]
  /** Reference evapotranspiration for the same forecast days (mm). */
  forecastEt0?: number[]
  /** Daily mean soil temperature at seeding depth, today (°C). */
  soilTempC?: number | null
  /** Highest daily chance of rain across the forecast (%). */
  rainProbability?: number[]
}

export interface SignalResult {
  signal: Signal
  /** Highest rain total over any `wetDays` window in the recent past (mm). */
  recentWetMm: number
  /** Highest rain total over any `wetDays` window in the forecast (mm). */
  forecastWetMm: number
  /** Longest run of dry days in the forecast. */
  forecastDrySpell: number
  reasons: string[]
  confidence: Confidence
  /** Things worth knowing that do not change the verdict. */
  cautions: string[]
  /** Rain against evaporative demand over the completed days, if ET0 was given. */
  recentWater: WaterBalance | null
  /** The same over the forecast. */
  forecastWater: WaterBalance | null
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
 * Split a daily series into completed days and days still to come.
 *
 * Today's daily total is a forecast until the day ends (it includes rain
 * expected later today), so today belongs with the forecast, not with the
 * rain that has already fallen.
 */
export function splitAtToday(rain: number[], todayIndex: number): { recent: number[]; forecast: number[] } {
  const i = Math.max(0, Math.min(todayIndex, rain.length))
  return { recent: rain.slice(0, i), forecast: rain.slice(i) }
}

/**
 * Should a farmer plant?
 *
 * Returns `unknown` when there is too little data to judge: fewer completed
 * days than the onset window, or a forecast too short to rule out a dry spell
 * of `drySpellDays`. An empty forecast must never read as "no dry spell".
 */
export function evaluateSignal(input: SignalInput, rule: OnsetRule = DEFAULT_RULE): SignalResult {
  const { recentRain, forecastRain, monthNormalMm } = input
  const recentWater = input.recentEt0 ? waterBalance(recentRain, input.recentEt0) : null
  const forecastWater = input.forecastEt0 ? waterBalance(forecastRain, input.forecastEt0) : null
  const base = { recentWater, forecastWater }

  const missing: string[] = []
  if (recentRain.length < rule.wetDays) {
    missing.push(`Only ${recentRain.length} completed ${plural(recentRain.length, 'day')} of recent rain; ${rule.wetDays} are needed.`)
  }
  if (forecastRain.length < rule.drySpellDays) {
    missing.push(
      `Only ${forecastRain.length} ${plural(forecastRain.length, 'day')} of forecast; at least ${rule.drySpellDays} are needed to check for a dry spell.`,
    )
  }
  if (missing.length > 0) {
    return {
      ...base,
      signal: 'unknown',
      recentWetMm: 0,
      forecastWetMm: 0,
      forecastDrySpell: 0,
      reasons: missing,
      confidence: 'marginal',
      cautions: [],
    }
  }

  const recentWetMm = maxRollingSum(recentRain.slice(-rule.wetDays * 2), rule.wetDays)
  const forecastWetMm = maxRollingSum(forecastRain, rule.wetDays)
  const forecastDrySpell = longestDrySpell(forecastRain, rule.dryDayMm)
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
    reasons.push(`The forecast shows ${forecastDrySpell} dry ${plural(forecastDrySpell, 'day')} in a row, which could stress new seedlings.`)
  }

  if (!wetEnough && rainComing) {
    reasons.push(`Around ${forecastWetMm} mm is forecast within ${rule.wetDays} days. Wait for it to fall before planting.`)
  }

  let signal: Signal
  if (wetEnough && !drySpellAhead && !offSeason) signal = 'plant'
  else if (wetEnough || rainComing) signal = 'wait'
  else signal = 'dry'

  const { confidence, cautions } = qualify(input, forecastWater, recentWater)
  return { ...base, signal, recentWetMm, forecastWetMm, forecastDrySpell, reasons, confidence, cautions }
}

/**
 * Notes that colour the answer without changing it: whether rain is keeping
 * pace with the sun, whether the soil is fit to germinate seed, and whether
 * the forecast rain is likely enough to count on.
 */
function qualify(
  input: SignalInput,
  forecastWater: WaterBalance | null,
  recentWater: WaterBalance | null,
): { confidence: Confidence; cautions: string[] } {
  const cautions: string[] = []
  let confidence: Confidence = 'good'

  if (isMarginal(forecastWater)) {
    confidence = 'marginal'
    cautions.push(
      `Over the next ${input.forecastRain.length} days the ground is forecast to get ${forecastWater!.rainMm} mm of rain but lose ${forecastWater!.et0Mm} mm to sun and wind, a shortfall of ${Math.abs(forecastWater!.netMm)} mm. Young seedlings may struggle even if enough rain falls to plant.`,
    )
  } else if (isMarginal(recentWater)) {
    cautions.push(
      `The ground is still drying out: ${recentWater!.rainMm} mm of rain over the last ${input.recentRain.length} days against ${recentWater!.et0Mm} mm lost to sun and wind.`,
    )
  }

  const soil = input.soilTempC
  if (soil !== null && soil !== undefined) {
    if (soil < MAIZE_SOIL_TEMP_MIN_C) {
      confidence = 'marginal'
      cautions.push(`Soil at seeding depth is ${Math.round(soil)} °C, too cold for maize to germinate well (it wants ${MAIZE_SOIL_TEMP_MIN_C} °C or more).`)
    } else if (soil > MAIZE_SOIL_TEMP_MAX_C) {
      confidence = 'marginal'
      cautions.push(`Soil at seeding depth is ${Math.round(soil)} °C, hot enough to hurt emergence (maize prefers below ${MAIZE_SOIL_TEMP_MAX_C} °C).`)
    }
  }

  const prob = input.rainProbability
  if (prob && prob.length > 0) {
    const best = Math.max(...prob)
    if (best < LOW_RAIN_PROBABILITY) {
      cautions.push(`The forecast is not confident of rain: the best chance on any day ahead is ${Math.round(best)}%.`)
    }
  }

  return { confidence, cautions }
}

/** "1 day", "2 days". */
export function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
