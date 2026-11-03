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
  const pct = (p: number) => Math.round(p * 100)
  const leaning =
    outlook.below > 0.45 ? 'drier than normal' : outlook.above > 0.45 ? 'wetter than normal' : 'close to normal'

  return (
    <section className="card" data-testid="outlook">
      <h3>Season outlook: {windowLabel(months)}</h3>
      <p className="sub">
        Leaning <strong>{leaning}</strong>. Normal for these months is about {formatRain(outlook.normalMm, units.rain)};
        the forecast median is {formatRain(outlook.forecastMedianMm, units.rain)}.
      </p>
      <div className="tercile" role="img" aria-label={`${pct(outlook.below)}% below, ${pct(outlook.near)}% near, ${pct(outlook.above)}% above normal`}>
        <div className="t-below" style={{ flexGrow: outlook.below || 0.001 }}>{pct(outlook.below) >= 12 && `${pct(outlook.below)}%`}</div>
        <div className="t-near" style={{ flexGrow: outlook.near || 0.001 }}>{pct(outlook.near) >= 12 && `${pct(outlook.near)}%`}</div>
        <div className="t-above" style={{ flexGrow: outlook.above || 0.001 }}>{pct(outlook.above) >= 12 && `${pct(outlook.above)}%`}</div>
      </div>
      <div className="legend">
        <span><i className="sw below" /> drier ({pct(outlook.below)}%)</span>
        <span><i className="sw near" /> normal ({pct(outlook.near)}%)</span>
        <span><i className="sw above" /> wetter ({pct(outlook.above)}%)</span>
      </div>
      <p className="fine">
        Based on {memberCount} runs of the ECMWF seasonal model compared with 1991–2020 rainfall here. Not yet
        bias-corrected, so use it as a rough guide alongside your national weather service.
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
