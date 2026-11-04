// Agronomic thresholds, kept in one place with their reasoning.
//
// These are crop and physics constants, not local policy, so unlike the onset
// rainfall rule they are not exposed as settings. Every one of them is
// PROVISIONAL and needs review by an agronomist or against AREX guidance
// before Kurima claims any of it is advice. See docs/validation.md.

/**
 * Rain must reach this fraction of evaporative demand (ET0) over the forecast
 * window for conditions after planting to count as comfortable.
 *
 * Chosen by backtest, not by hand: across 116 onset events at four Zimbabwe
 * districts (1991–2019), a ratio below 0.5 flags 7 of the 10 starts that were
 * followed by a killing dry spell, at the cost of 7 false alarms. Below 0.4 it
 * catches only 4; above 0.6 the false alarms nearly double with no extra
 * catches. It is a weak signal on its own, which is why it colours the answer
 * rather than overriding it.
 *
 * FAO's crop-water guidance (Irrigation and Drainage Paper 56) uses rainfall
 * against ET0 the same way to judge whether a season has started.
 */
export const MARGINAL_WATER_RATIO = 0.5

/**
 * Maize germination range, as a daily mean at seeding depth (0–7 cm).
 * Below about 12 °C germination stalls; much above 35 °C emergence suffers.
 *
 * In practice neither fires in Zimbabwe: across the same 116 events the daily
 * mean ran 13.5–28.9 °C. It is kept because it will matter at altitude in East
 * Africa, and because a reading outside this range is worth saying out loud.
 */
export const MAIZE_SOIL_TEMP_MIN_C = 12
export const MAIZE_SOIL_TEMP_MAX_C = 35

/**
 * Forecast rain below this chance (%) is not something to plan a planting
 * around. Open-Meteo reports a daily maximum probability.
 */
export const LOW_RAIN_PROBABILITY = 40
