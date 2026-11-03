import { convertRain, formatRain, rainUnitLabel, type Units } from '../lib/units'

interface Props {
  dates: string[]
  rain: number[]
  /** Index of today. Today and later are forecast; earlier days are completed. */
  todayIndex: number
  units: Units
  children?: React.ReactNode
}

const W = 600
const H = 180
const PAD_B = 24
const PAD_T = 16

export function RainChart({ dates, rain, todayIndex, units, children }: Props) {
  const max = Math.max(10, ...rain)
  const step = W / rain.length
  const barW = Math.max(2, step - 4)
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / max)
  const past = rain.slice(0, todayIndex)
  const totalPast = past.reduce((a, b) => a + b, 0)
  const totalNext = rain.slice(todayIndex).reduce((a, b) => a + b, 0)
  const axisMax = units.rain === 'in' ? convertRain(max, 'in').toFixed(1) : Math.round(max)

  return (
    <section className="card" data-testid="rain-chart">
      <h3>Rain: last 2 weeks (modelled) and next 16 days</h3>
      <p className="sub">
        About {formatRain(totalPast, units.rain)} modelled over the last {past.length} days ·{' '}
        {formatRain(totalNext, units.rain)} forecast from today
      </p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily rainfall bar chart">
          <rect x={todayIndex * step} y={0} width={W - todayIndex * step} height={H - PAD_B} className="forecast-zone" />
          {rain.map((v, i) => (
            <rect
              key={dates[i]}
              x={i * step + 2}
              y={y(v)}
              width={barW}
              height={H - PAD_B - y(v)}
              rx={2}
              className={i < todayIndex ? 'bar-past' : 'bar-forecast'}
            >
              <title>{`${dates[i]}: ${formatRain(v, units.rain)}${i < todayIndex ? ' (modelled)' : ' (forecast)'}`}</title>
            </rect>
          ))}
          <line x1={todayIndex * step} x2={todayIndex * step} y1={4} y2={H - PAD_B} className="today" />
          <text x={(todayIndex + 0.5) * step} y={H - 6} textAnchor="middle" className="axis">today</text>
          <text x={4} y={H - 6} className="axis">{dates[0]?.slice(5)}</text>
          <text x={W - 4} y={H - 6} textAnchor="end" className="axis">{dates[dates.length - 1]?.slice(5)}</text>
          <text x={4} y={12} className="axis">{axisMax} {rainUnitLabel(units.rain)}</text>
        </svg>
      </div>
      <div className="legend">
        <span><i className="sw past" /> modelled (past days)</span>
        <span><i className="sw forecast" /> forecast (today onwards)</span>
      </div>
      <p className="fine">
        Past days are archived weather-model estimates, not rain-gauge readings. Today's bar is still a forecast
        until the day ends.
      </p>
      {children}
    </section>
  )
}
