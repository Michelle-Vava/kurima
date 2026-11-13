import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { addDays, daysBetween } from '../lib/dates'
import type { DailySeries } from '../lib/climate'
import { densify, indexOf } from '../lib/series'
import { convertRain, formatRain, rainUnitLabel, type Units } from '../lib/units'

interface Props {
  dates: string[]
  rain: number[]
  /** Index of today. Today and later are forecast; earlier days are completed. */
  todayIndex: number
  units: Units
  /** Rain since the start of the farming year, for scrolling back past the forecast window. */
  history?: DailySeries | null
  children?: React.ReactNode
}

const W = 760
const H = 190
const PAD_B = 26
const PAD_T = 18
/** How many days are on screen at once. */
const WINDOW = 30
/** How far one tap of the arrows moves. */
const JUMP = 14

/**
 * Rain, day by day, with the past reachable.
 *
 * The chart used to show a fixed window: fourteen days back, sixteen
 * forward, and no way to look further. But "it poured a fortnight ago, why
 * does it still say too dry?" is the commonest reason to doubt the answer,
 * and the answer is visible only if you can scroll back to the storm and see
 * how little it was. So the window slides, as far back as the archive for
 * this season reaches.
 *
 * Only the weather travels. Kurima does not replay what it *would have
 * advised* on a past day, because it cannot: the forecast that existed that
 * morning is gone, and a verdict reconstructed with hindsight would look far
 * cleverer than the app really is.
 */
export function RainChart({ dates, rain, todayIndex, units, history, children }: Props) {
  const today = dates[todayIndex] ?? dates[0]
  const forecastEnd = dates[dates.length - 1]

  // One calendar grid: the season's archive, overlaid with the forecast call,
  // which is fresher for the days they share and is the only source ahead.
  const merged = densify(history?.time.length ? history : { time: [], values: [] })
  const earliest = merged.mm.length > 0 && merged.from < dates[0] ? merged.from : dates[0]
  const totalDays = daysBetween(earliest, forecastEnd) + 1
  const dayAt = (i: number) => addDays(earliest, i)
  const mmAt = (i: number): number | null => {
    const d = dayAt(i)
    const f = dates.indexOf(d)
    if (f !== -1) return rain[f]
    const h = indexOf(merged, d)
    return h === -1 ? null : merged.mm[h]
  }

  // How far the farmer has scrolled from the default view, in days. Stored as
  // a delta rather than an absolute index because the season archive arrives
  // after the first render: an index captured then would pin the chart to
  // whatever range existed before the history loaded, which is August.
  const [shift, setShift] = useState(0)
  const maxOffset = Math.max(0, totalDays - WINDOW)
  const home = Math.min(Math.max(0, daysBetween(earliest, today) - 14), maxOffset)
  const offset = Math.min(maxOffset, Math.max(0, home + shift))
  const atDefault = shift === 0

  const slots = Array.from({ length: WINDOW }, (_, k) => offset + k).filter((i) => i < totalDays)
  const values = slots.map(mmAt)
  const shown = values.filter((v): v is number => v !== null)
  const max = Math.max(10, ...shown)
  const step = W / slots.length
  const barW = Math.max(2, step - 4)
  const y = (v: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - v / max)
  const axisMax = units.rain === 'in' ? convertRain(max, 'in').toFixed(1) : Math.round(max)

  const todayIdx = daysBetween(earliest, today)
  const todayX = (todayIdx - offset) * step
  const todayVisible = todayIdx >= offset && todayIdx < offset + slots.length

  const fellMm = slots.reduce((sum, i) => (dayAt(i) < today ? sum + (mmAt(i) ?? 0) : sum), 0)
  const aheadMm = slots.reduce((sum, i) => (dayAt(i) >= today ? sum + (mmAt(i) ?? 0) : sum), 0)
  const canBack = offset > 0
  const canForward = offset < maxOffset

  return (
    <section className="card" data-testid="rain-chart">
      <div className="card-head">
        <div>
          <h3>Rain, day by day</h3>
          <p className="sub">
            {label(dayAt(slots[0]))} to {label(dayAt(slots[slots.length - 1]))} ·{' '}
            {formatRain(fellMm, units.rain)} fallen, {formatRain(aheadMm, units.rain)} forecast
          </p>
        </div>
        <div className="scrubber" role="group" aria-label="Move the chart through time">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShift((d) => Math.max(-home, d - JUMP))}
            disabled={!canBack}
            aria-label={`Back ${JUMP} days`}
          >
            <ChevronLeft size={17} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShift(0)}
            disabled={atDefault}
            aria-label="Back to today"
          >
            <RotateCcw size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShift((d) => Math.min(maxOffset - home, d + JUMP))}
            disabled={!canForward}
            aria-label={`Forward ${JUMP} days`}
          >
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      </div>

      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily rainfall bar chart">
          {todayVisible && <rect x={todayX} y={0} width={W - todayX} height={H - PAD_B} className="forecast-zone" />}
          {slots.map((i, k) => {
            const v = mmAt(i)
            if (v === null) return null
            return (
              <rect
                key={dayAt(i)}
                x={k * step + 2}
                y={y(v)}
                width={barW}
                height={H - PAD_B - y(v)}
                rx={2}
                className={dayAt(i) < today ? 'bar-past' : 'bar-forecast'}
              >
                <title>{`${dayAt(i)}: ${formatRain(v, units.rain)}${dayAt(i) < today ? ' (modelled)' : ' (forecast)'}`}</title>
              </rect>
            )
          })}
          {todayVisible && (
            <>
              <line x1={todayX} x2={todayX} y1={4} y2={H - PAD_B} className="today" />
              <text x={todayX + 4} y={13} className="axis strong">today</text>
            </>
          )}
          <text x={4} y={H - 7} className="axis">{label(dayAt(slots[0]))}</text>
          <text x={W - 4} y={H - 7} textAnchor="end" className="axis">{label(dayAt(slots[slots.length - 1]))}</text>
          <text x={4} y={13} className="axis">{axisMax} {rainUnitLabel(units.rain)}</text>
        </svg>
      </div>

      <div className="legend">
        <span><i className="sw past" /> already fallen (weather model, not a rain gauge)</span>
        <span><i className="sw forecast" /> forecast, today included</span>
      </div>
      {children}
    </section>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function label(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
}
