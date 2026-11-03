import { DataLabel } from '../components/DataLabel'
import { NormalsChart } from '../components/NormalsChart'
import { DrySeasonCard, OutlookCard } from '../components/OutlookCard'
import {
  isDrySeasonWindow,
  monthlyNormals,
  percentile,
  seasonTotalsByYear,
  tercileOutlook,
  type DailySeries,
} from '../lib/climate'
import { memberTotals, type SeasonalForecast } from '../lib/openMeteo'
import type { Units } from '../lib/units'
import type { Async } from '../state/useSource'

interface Props {
  history: Async<DailySeries>
  seasonal: Async<SeasonalForecast>
  outlookMonths: number[]
  units: Units
  now: Date
}

/** At least this many past seasons before a tercile split means anything. */
const MIN_SEASONS = 10

export function SeasonScreen({ history, seasonal, outlookMonths, units, now }: Props) {
  if (history.status === 'loading' || history.status === 'idle') {
    return <div className="card skeleton">Comparing with 30 years of history…</div>
  }
  if (history.status === 'error') return <div className="card error">History unavailable: {history.message}</div>

  const hist = history.loaded
  const normals = monthlyNormals(hist.data)
  const past = seasonTotalsByYear(hist.data, outlookMonths)

  return (
    <>
      {renderOutlook()}
      <NormalsChart normals={normals} currentMonth={now.getMonth()} units={units}>
        <DataLabel loaded={hist} now={now} />
      </NormalsChart>
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
