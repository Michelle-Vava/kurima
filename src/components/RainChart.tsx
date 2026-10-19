interface Props {
  dates: string[]
  rain: number[]
  todayIndex: number
}

const W = 600
const H = 180
const PAD_B = 24
const PAD_T = 16

export function RainChart({ dates, rain, todayIndex }: Props) {
  const max = Math.max(10, ...rain)
  const step = W / rain.length
  const barW = Math.max(2, step - 4)
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / max)
  const totalPast = rain.slice(0, todayIndex + 1).reduce((a, b) => a + b, 0)
  const totalNext = rain.slice(todayIndex + 1).reduce((a, b) => a + b, 0)

  return (
    <section className="card">
      <h3>Rain: last 2 weeks and next 16 days</h3>
      <p className="sub">
        {Math.round(totalPast)} mm fell in the last 15 days · {Math.round(totalNext)} mm forecast
      </p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily rainfall bar chart">
          <rect
            x={(todayIndex + 1) * step}
            y={0}
            width={W - (todayIndex + 1) * step}
            height={H - PAD_B}
            className="forecast-zone"
          />
          {rain.map((v, i) => (
            <rect
              key={dates[i]}
              x={i * step + 2}
              y={y(v)}
              width={barW}
              height={H - PAD_B - y(v)}
              rx={2}
              className={i <= todayIndex ? 'bar-past' : 'bar-forecast'}
            >
              <title>{`${dates[i]}: ${v.toFixed(1)} mm`}</title>
            </rect>
          ))}
          <line x1={(todayIndex + 0.5) * step} x2={(todayIndex + 0.5) * step} y1={4} y2={H - PAD_B} className="today" />
          <text x={(todayIndex + 0.5) * step} y={H - 6} textAnchor="middle" className="axis">today</text>
          <text x={4} y={H - 6} className="axis">{dates[0]?.slice(5)}</text>
          <text x={W - 4} y={H - 6} textAnchor="end" className="axis">{dates[dates.length - 1]?.slice(5)}</text>
          <text x={4} y={12} className="axis">{Math.round(max)} mm</text>
        </svg>
      </div>
      <div className="legend">
        <span><i className="sw past" /> observed</span>
        <span><i className="sw forecast" /> forecast</span>
      </div>
    </section>
  )
}
