import type { Outlook } from '../lib/climate'
import { formatRain, type Units } from '../lib/units'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function windowLabel(months: number[]): string {
  return `${MONTHS[months[0] - 1]}–${MONTHS[months[months.length - 1] - 1]}`
}

interface Props {
  outlook: Outlook
  months: number[]
  memberCount: number
  units: Units
  children?: React.ReactNode
}

export function OutlookCard({ outlook, months, memberCount, units, children }: Props) {
  const lean: 'below' | 'near' | 'above' =
    outlook.below > 0.45 ? 'below' : outlook.above > 0.45 ? 'above' : 'near'
  const leaning = { below: 'drier than normal', above: 'wetter than normal', near: 'close to normal' }[lean]

  return (
    <section className="card" data-testid="outlook">
      <h3>Season outlook: {windowLabel(months)}</h3>
      <p className="sub">
        Leaning <strong>{leaning}</strong>. Normal for these months is about {formatRain(outlook.normalMm, units.rain)};
        the forecast median is {formatRain(outlook.forecastMedianMm, units.rain)}.
      </p>
      {/* The model is not bias-corrected against its own hindcasts, so the
          tercile split is not a real probability. Showing "37%" would be false
          precision; the direction is the most that can honestly be claimed
          until Milestone 1 Phase 2 calibrates it. */}
      <div className="tercile lean" role="img" aria-label={`Leaning ${leaning}`}>
        <div className={`t-below${lean === 'below' ? ' on' : ''}`}>drier</div>
        <div className={`t-near${lean === 'near' ? ' on' : ''}`}>normal</div>
        <div className={`t-above${lean === 'above' ? ' on' : ''}`}>wetter</div>
      </div>
      <p className="fine">
        Based on {memberCount} runs of the ECMWF seasonal model against 1991–2020 rainfall here. The model has not
        been checked against its own past forecasts yet, so Kurima shows only which way it leans, not a percentage.
        Use it alongside your national weather service.
      </p>
      {children}
    </section>
  )
}

interface DryProps {
  months: number[]
  normalMm: number
  units: Units
  children?: React.ReactNode
}

/** Shown instead of the outlook when the window is the dry season here. */
export function DrySeasonCard({ months, normalMm, units, children }: DryProps) {
  return (
    <section className="card" data-testid="outlook-dry">
      <h3>Season outlook: {windowLabel(months)}</h3>
      <p className="sub">
        <strong>Dry season here.</strong> These months normally get about {formatRain(normalMm, units.rain)} in total,
        so there is no rainy-season outlook to show. Check back as the rains approach.
      </p>
      {children}
    </section>
  )
}
