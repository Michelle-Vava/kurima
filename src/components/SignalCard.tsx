import type { SignalResult } from '../lib/onset'

const COPY = {
  plant: { title: 'Good time to plant', icon: '🌱', note: 'The rains look established.' },
  wait: { title: 'Wait a little', icon: '⏳', note: 'Conditions are close, but not safe yet.' },
  dry: { title: 'Too dry to plant', icon: '☀️', note: 'Not enough rain yet.' },
} as const

interface Props {
  result: SignalResult
  soilMoisture: number | null
}

export function SignalCard({ result, soilMoisture }: Props) {
  const c = COPY[result.signal]
  return (
    <section className={`card signal signal-${result.signal}`} aria-live="polite">
      <div className="signal-head">
        <span className="signal-icon" aria-hidden>{c.icon}</span>
        <div>
          <h2>{c.title}</h2>
          <p>{c.note}</p>
        </div>
      </div>

      <div className="stats">
        <div><span>{result.recentWetMm} mm</span>wettest recent spell</div>
        <div><span>{result.forecastWetMm} mm</span>wettest forecast spell</div>
        <div><span>{result.forecastDrySpell} days</span>longest dry run ahead</div>
        {soilMoisture !== null && (
          <div><span>{Math.round(soilMoisture * 100)}%</span>soil moisture (9–27 cm)</div>
        )}
      </div>

      <ul className="reasons">
        {result.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </section>
  )
}
