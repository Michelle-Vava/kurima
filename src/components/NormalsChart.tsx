import { convertRain, formatRain, type Units } from '../lib/units'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface Props {
  normals: number[]
  currentMonth: number // 0-based
  units: Units
  children?: React.ReactNode
}

const W = 600
const H = 170
const PAD_B = 22
const PAD_T = 18

export function NormalsChart({ normals, currentMonth, units, children }: Props) {
  const max = Math.max(20, ...normals)
  const step = W / 12
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / max)
  const wettest = normals.indexOf(Math.max(...normals))
  const yearly = normals.reduce((a, b) => a + b, 0)
  const rainyMonths = normals.filter((n) => n >= 50).length
  // Two decimals on twelve bars is unreadable, so bar labels get one for
  // inches and none for millimetres.
  const barLabel = (v: number) => (units.rain === 'in' ? convertRain(v, 'in').toFixed(1) : String(Math.round(v)))

  return (
    <section className="card" data-testid="normals">
      <h3>Normal rainfall here (1991–2020)</h3>
      <p className="sub">
        About {formatRain(yearly, units.rain)} a year · wettest month is {NAMES[wettest]} · {rainyMonths} months
        usually get 50 mm or more
      </p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Average monthly rainfall">
          {normals.map((v, i) => (
            <g key={i}>
              <rect
                x={i * step + 8}
                y={y(v)}
                width={step - 16}
                height={H - PAD_B - y(v)}
                rx={4}
                className={i === currentMonth ? 'bar-now' : 'bar-normal'}
              >
                <title>{`${NAMES[i]}: ${formatRain(v, units.rain)}`}</title>
              </rect>
              <text x={i * step + step / 2} y={y(v) - 4} textAnchor="middle" className="axis">{barLabel(v)}</text>
              <text x={i * step + step / 2} y={H - 6} textAnchor="middle" className={i === currentMonth ? 'axis strong' : 'axis'}>
                {MONTHS[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {children}
    </section>
  )
}
