// The two sentences that turn "wait" into something a farmer can plan around:
// when the rains usually break here, and how this season compares so far.

import { pastRainToDate, type Climate } from './climatePack'
import { rainySeasonCount, type DailySeries } from './climate'
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

/** Why Kurima is not naming a usual onset date here. */
export type NoTypicalReason =
  /** Two rainy seasons a year; one date would describe neither. */
  | 'two-seasons'
  /** No rainy season worth the name. */
  | 'no-season'
  /** Too few past seasons came through the record to average. */
  | 'too-few-seasons'

export interface SeasonContext {
  typical: TypicalOnset | null
  /** Set whenever `typical` is null, so the screen can say why. */
  noTypical: NoTypicalReason | null
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
  // A single onset date assumes a single rainy season. Where there are two,
  // the median of both is a date in the dry gap between them — confident,
  // specific and wrong. Judging onset per season is Roadmap item 7; until
  // then the honest answer here is nothing.
  const seasons = rainySeasonCount(climate.normals)
  const stats = onsetStats(climate.onsetDoys, climate.startMonth)
  let typical: TypicalOnset | null = null
  let noTypical: NoTypicalReason | null = null
  if (seasons === 0) noTypical = 'no-season'
  else if (seasons > 1) noTypical = 'two-seasons'
  else if (!stats) noTypical = 'too-few-seasons'
  else typical = typicalOnset(stats, today)

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
  return { typical, noTypical, soFar }
}
