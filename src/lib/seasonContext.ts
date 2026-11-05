// The two sentences that turn "wait" into something a farmer can plan around:
// when the rains usually break here, and how this season compares so far.

import { pastRainToDate, type Climate } from './climatePack'
import type { DailySeries } from './climate'
import { addDays, dayOfSeason, onsetStats, rankAmong, seasonStart, seasonYearOf, typicalOnset, type TypicalOnset } from './season'

export interface SeasonSoFar {
  /** First day of this season. */
  from: string
  /** Last day counted, chosen to match a day kept for past seasons. */
  through: string
  mm: number
  /** 0 = driest season on record by this date, 1 = wettest. */
  rank: number
  seasons: number
}

export interface SeasonContext {
  typical: TypicalOnset | null
  soFar: SeasonSoFar | null
}

/**
 * @param archive  Daily rain for this season from the archive (lags a few days).
 * @param recent   Completed days from the forecast call, to fill the lag: [date, mm].
 */
export function seasonContext(
  climate: Climate,
  today: string,
  archive: DailySeries | null,
  recent: [string, number][],
): SeasonContext {
  const stats = onsetStats(climate.onsetDoys, climate.startMonth)
  const typical = stats ? typicalOnset(stats, today) : null

  let soFar: SeasonSoFar | null = null
  const from = seasonStart(seasonYearOf(today, climate.startMonth), climate.startMonth)
  const yesterday = addDays(today, -1)
  if (yesterday >= from) {
    const past = pastRainToDate(climate, dayOfSeason(yesterday, climate.startMonth))
    const through = addDays(from, past.doy)
    const byDate = new Map<string, number>()
    archive?.time.forEach((d, i) => {
      const v = archive.values[i]
      if (v !== null && !Number.isNaN(v)) byDate.set(d, v)
    })
    for (const [d, mm] of recent) if (!byDate.has(d)) byDate.set(d, mm)
    let mm = 0
    let have = 0
    for (let d = from; d <= through; d = addDays(d, 1)) {
      const v = byDate.get(d)
      if (v !== undefined) {
        mm += v
        have++
      }
    }
    const rank = rankAmong(mm, past.totals)
    // Only speak when most of the season so far is actually accounted for.
    if (rank !== null && have > 0 && have >= 0.8 * (past.doy + 1)) {
      soFar = { from, through, mm: Math.round(mm * 10) / 10, rank, seasons: past.totals.length }
    }
  }
  return { typical, soFar }
}
