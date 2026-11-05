import { plural } from '../lib/onset'
import type { SeasonContext } from '../lib/seasonContext'
import { formatRain, type Units } from '../lib/units'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function nice(d: string): string {
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
}

/** When the rains usually break here, and how this season compares so far. */
export function SeasonContextNote({ context, units }: { context: SeasonContext; units: Units }) {
  const { typical, soFar } = context
  if (!typical && !soFar) return null
  return (
    <div className="season-context" data-testid="season-context">
      {typical && (
        <p>
          {typical.daysAway > 0 ? (
            <>
              The rains here usually break around <strong>{nice(typical.date)}</strong>, {typical.daysAway}{' '}
              {plural(typical.daysAway, 'day')} away.
            </>
          ) : typical.daysAway === 0 ? (
            <>The rains here usually break around <strong>today</strong>.</>
          ) : (
            <>
              The rains here usually break around <strong>{nice(typical.date)}</strong>, {-typical.daysAway}{' '}
              {plural(-typical.daysAway, 'day')} ago.
            </>
          )}{' '}
          <span className="muted">Most years: {nice(typical.from)} to {nice(typical.to)}.</span>
        </p>
      )}
      {soFar && (
        <p>
          Since {nice(soFar.from)}: <strong>{formatRain(soFar.mm, units.rain)}</strong>,{' '}
          {soFar.rank < 0.5
            ? `drier than ${Math.round((1 - soFar.rank) * 100)}% of the last ${soFar.seasons} seasons by this date.`
            : `wetter than ${Math.round(soFar.rank * 100)}% of the last ${soFar.seasons} seasons by this date.`}
        </p>
      )}
    </div>
  )
}
