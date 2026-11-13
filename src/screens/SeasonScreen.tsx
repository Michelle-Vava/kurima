import { DataLabel } from '../components/DataLabel'
import { NormalsChart } from '../components/NormalsChart'
import { DrySeasonCard, OutlookCard } from '../components/OutlookCard'
import { SeasonCurves } from '../components/SeasonCurves'
import type { DailySeries } from '../lib/climate'
import { isDrySeasonWindow, percentile, tercileOutlook } from '../lib/climate'
import { windowTotals, type Climate } from '../lib/climatePack'
import { localIsoDate } from '../lib/freshness'
import { memberTotals, type SeasonalForecast } from '../lib/openMeteo'
import { dayOfSeason } from '../lib/season'
import { seasonContext } from '../lib/seasonContext'
import type { Units } from '../lib/units'
import type { Async } from '../state/useSource'

interface Props {
  climate: Async<Climate>
  seasonal: Async<SeasonalForecast>
  seasonRain: Async<DailySeries>
  outlookMonths: number[]
  units: Units
  now: Date
}

/** At least this many past seasons before a tercile split means anything. */
const MIN_SEASONS = 10

export function SeasonScreen({ climate, seasonal, seasonRain, outlookMonths, units, now }: Props) {
  if (climate.status === 'loading' || climate.status === 'idle') {
    return <div className="card skeleton">Comparing with 30 years of history…</div>
  }
  if (climate.status === 'error') return <div className="card error">History unavailable: {climate.message}</div>

  const hist = climate.loaded
  const normals = hist.data.normals
  const past = windowTotals(hist.data, outlookMonths)
  const today = localIsoDate(now)
  const ctx = seasonContext(hist.data, today, seasonRain.status === 'ok' ? seasonRain.loaded.data : null, [])
  const soFar = ctx.soFar
    ? { mm: ctx.soFar.mm, throughDoy: dayOfSeason(ctx.soFar.through, hist.data.startMonth) }
    : null

  return (
    <>
      <SeasonCurves climate={hist.data} soFar={soFar} today={today} units={units}>
        <DataLabel loaded={hist} now={now} />
      </SeasonCurves>
      <div className="stack">
        {renderOutlook()}
        <NormalsChart normals={normals} currentMonth={now.getMonth()} units={units}>
          <DataLabel loaded={hist} now={now} />
        </NormalsChart>
      </div>
    </>
  )

  function renderOutlook() {
    if (past.length < MIN_SEASONS) return null
    if (isDrySeasonWindow(past)) {
      return (
        <DrySeasonCard months={outlookMonths} normalMm={percentile(past, 0.5)} units={units}>
          <DataLabel loaded={hist} now={now} />
        </DrySeasonCard>
      )
    }
    if (seasonal.status === 'loading' || seasonal.status === 'idle') {
      return <div className="card skeleton">Reading the seasonal forecast…</div>
    }
    if (seasonal.status === 'error') {
      return <div className="card error">Season outlook unavailable: {seasonal.message}</div>
    }
    const members = memberTotals(seasonal.loaded.data, outlookMonths)
    if (members.length === 0) return null
    return (
      <OutlookCard
        outlook={tercileOutlook(past, members)}
        months={outlookMonths}
        memberCount={seasonal.loaded.data.members.length}
        units={units}
      >
        <DataLabel loaded={seasonal.loaded} now={now} />
      </OutlookCard>
    )
  }
}
