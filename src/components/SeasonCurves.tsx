import { percentile } from '../lib/climate'
import type { Climate } from '../lib/climatePack'
import { TO_DATE_STEP_DAYS } from '../lib/climatePack'
import { addDays } from '../lib/dates'
import { dayOfSeason, seasonStart, seasonYearOf } from '../lib/season'
import { convertRain, formatRain, rainUnitLabel, type Units } from '../lib/units'
import { Explain } from './Explain'

interface Props {
  climate: Climate
  /** Rain this season so far, and the day of season it runs to. */
  soFar: { mm: number; throughDoy: number } | null
  today: string
  units: Units
  children?: React.ReactNode
}

const W = 760
const H = 240
const PAD = { t: 18, r: 14, b: 28, l: 62 }

/**
 * This season's rain drawn on top of the thirty before it.
 *
 * The packs have carried a rain-to-date curve for every past season since
 * the start, and the app has shown none of it — it printed one sentence
 * ("wetter than 53% of the last 30 seasons") derived from a picture it never
 * drew. The picture is the more honest object: a band you can see the shape
 * of, rather than a percentile you have to trust.
 */
export function SeasonCurves({ climate, soFar, today, units, children }: Props) {
  const steps = climate.toDate.length
  const seasonsAt = (s: number) => climate.toDate[s] ?? []
  const usable = climate.toDate.some((t) => t.length >= 10)
  if (!usable) return null

  const lastDoy = (steps - 1) * TO_DATE_STEP_DAYS
  const bands = Array.from({ length: steps }, (_, s) => {
    const totals = seasonsAt(s)
    return {
      doy: s * TO_DATE_STEP_DAYS,
      lo: totals.length ? percentile(totals, 0.1) : 0,
      q1: totals.length ? percentile(totals, 0.25) : 0,
      mid: totals.length ? percentile(totals, 0.5) : 0,
      q3: totals.length ? percentile(totals, 0.75) : 0,
      hi: totals.length ? percentile(totals, 0.9) : 0,
    }
  })

  const maxMm = Math.max(10, ...bands.map((b) => b.hi), soFar?.mm ?? 0)
  const x = (doy: number) => PAD.l + ((W - PAD.l - PAD.r) * doy) / lastDoy
  const y = (mm: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - mm / maxMm)

  const area = (lo: (b: (typeof bands)[number]) => number, hi: (b: (typeof bands)[number]) => number) =>
    [
      ...bands.map((b) => `${x(b.doy)},${y(hi(b))}`),
      ...[...bands].reverse().map((b) => `${x(b.doy)},${y(lo(b))}`),
    ].join(' ')

  const line = (get: (b: (typeof bands)[number]) => number) => bands.map((b) => `${x(b.doy)},${y(get(b))}`).join(' ')

  const start = seasonStart(seasonYearOf(today, climate.startMonth), climate.startMonth)
  const nowDoy = Math.min(lastDoy, dayOfSeason(today, climate.startMonth))
  const seasons = Math.max(...climate.toDate.map((t) => t.length))
  const normalNow = bands[Math.min(steps - 1, Math.round(nowDoy / TO_DATE_STEP_DAYS))]?.mid ?? 0

  // Month ticks along the farming year.
  const ticks: { doy: number; label: string }[] = []
  for (let d = 0; d <= lastDoy; d += 1) {
    const iso = addDays(start, d)
    if (iso.slice(8, 10) === '01') ticks.push({ doy: d, label: MONTHS[Number(iso.slice(5, 7)) - 1] })
  }

  return (
    <section className="card" data-testid="season-curves">
      <div className="card-head">
        <div>
          <h3>This season against the last {seasons}</h3>
          <p className="sub">
            Rain added up from the start of the farming year ({label(start)}), so the line only ever climbs.
          </p>
        </div>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rain so far this season against ${seasons} past seasons`}>
          <polygon points={area((b) => b.lo, (b) => b.hi)} className="band-wide" />
          <polygon points={area((b) => b.q1, (b) => b.q3)} className="band-mid" />
          <polyline points={line((b) => b.mid)} className="line-normal" fill="none" />

          {soFar && (
            <>
              <polyline
                points={`${x(0)},${y(0)} ${x(Math.min(lastDoy, soFar.throughDoy))},${y(soFar.mm)}`}
                className="line-now"
                fill="none"
              />
              <circle cx={x(Math.min(lastDoy, soFar.throughDoy))} cy={y(soFar.mm)} r={4.5} className="dot-now" />
            </>
          )}

          <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} className="axis-line" />
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="axis-line" />
          {ticks.map((t) => (
            <text key={t.doy} x={x(t.doy)} y={H - 9} textAnchor="middle" className="axis">
              {t.label}
            </text>
          ))}
          <text x={PAD.l - 6} y={y(maxMm) + 4} textAnchor="end" className="axis">
            {units.rain === 'in' ? convertRain(maxMm, 'in').toFixed(0) : Math.round(maxMm)} {rainUnitLabel(units.rain)}
          </text>
          <text x={PAD.l - 6} y={y(0)} textAnchor="end" className="axis">0</text>
        </svg>
      </div>

      <div className="legend">
        <span><i className="sw now" /> this season</span>
        <span><i className="sw normal" /> the usual amount</span>
        <span><i className="sw band-mid-sw" /> half of past seasons</span>
        <span><i className="sw band-wide-sw" /> most past seasons</span>
      </div>

      <div className="fine">
        <Explain
          title="How to read this"
          term={
            <>
              <p>
                Every line starts at zero on the first day of the farming year and climbs as rain falls, so the height
                at any point is <em>all the rain since the season began</em>, not the rain that day.
              </p>
              <p>
                The shaded bands are what past seasons did by the same date. If your line sits inside the dark band,
                this season is ordinary. Below the pale band and it is one of the driest on record by this point.
              </p>
            </>
          }
        >
          <span>What am I looking at?</span>
        </Explain>
        {soFar && (
          <>
            {' '}By now a usual season here has had about {formatRain(normalNow, units.rain)}; this one has had{' '}
            {formatRain(soFar.mm, units.rain)}.
          </>
        )}
      </div>
      {children}
    </section>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function label(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
}
