import type { Outlook } from '../lib/climate'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  outlook: Outlook
  months: number[]
  memberCount: number
}

export function OutlookCard({ outlook, months, memberCount }: Props) {
  const label = `${MONTHS[months[0] - 1]}–${MONTHS[months[months.length - 1] - 1]}`
  const pct = (p: number) => Math.round(p * 100)
  const leaning =
    outlook.below > 0.45 ? 'drier than normal' : outlook.above > 0.45 ? 'wetter than normal' : 'close to normal'

  return (
    <section className="card">
      <h3>Season outlook: {label}</h3>
      <p className="sub">
        Leaning <strong>{leaning}</strong>. Normal for these months is about {outlook.normalMm} mm; the forecast
        median is {outlook.forecastMedianMm} mm.
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
    </section>
  )
}
