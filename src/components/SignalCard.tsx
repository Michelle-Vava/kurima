import { plural, type SignalResult } from '../lib/onset'

const COPY = {
  plant: { title: 'Good time to plant', icon: '🌱', note: 'The rains look established.' },
  wait: { title: 'Wait a little', icon: '⏳', note: 'Conditions are close, but not safe yet.' },
  dry: { title: 'Too dry to plant', icon: '☀️', note: 'Not enough rain yet.' },
  unknown: { title: 'Not enough data', icon: '❔', note: 'Kurima cannot give an answer from the data it has.' },
} as const

interface Props {
  result: SignalResult
  soilMoisture: number | null
  /** Date the forecast was issued for (YYYY-MM-DD, local to the place). */
  issued: string
  /** Whole days since `issued`. */
  ageDays: number
}

export function SignalCard({ result, soilMoisture, issued, ageDays }: Props) {
  const c = COPY[result.signal]
  const unknown = result.signal === 'unknown'
  return (
    <section className={`card signal signal-${result.signal}`} aria-live="polite" data-signal={result.signal}>
      <div className="signal-head">
        <span className="signal-icon" aria-hidden>{c.icon}</span>
        <div>
          <h2>{c.title}</h2>
          <p>{c.note}</p>
        </div>
      </div>

      {!unknown && (
        <div className="stats">
          <div><span>{result.recentWetMm} mm</span>wettest recent spell (modelled)</div>
          <div><span>{result.forecastWetMm} mm</span>wettest forecast spell</div>
          <div><span>{result.forecastDrySpell} {plural(result.forecastDrySpell, 'day')}</span>longest dry run ahead</div>
          {soilMoisture !== null && (
            <div><span>{Math.round(soilMoisture * 100)}%</span>soil moisture (9–27 cm)</div>
          )}
        </div>
      )}

      <ul className="reasons">
        {result.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>

      <p className="fine data-age">
        Forecast issued {issued}
        {ageDays === 0 ? ' (today)' : ` (${ageDays} ${plural(ageDays, 'day')} old)`}. Past days are modelled estimates,
        not rain-gauge readings.
      </p>
    </section>
  )
}
