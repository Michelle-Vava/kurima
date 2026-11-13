import { plural } from '../lib/onset'
import type { SeasonContext } from '../lib/seasonContext'
import { formatRain, type Units } from '../lib/units'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function nice(d: string): string {
  return `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
}

/** When the rains usually break here, and how this season compares so far. */
export function SeasonContextNote({ context, units }: { context: SeasonContext; units: Units }) {
  const { typical, noTypical, soFar } = context
  // Only one reason is worth a line. "No rainy season" the Season screen
  // already says, and "too few seasons" is Kurima's problem, not the
  // farmer's. Two seasons is different: the farmer knows there are two and
  // would otherwise assume Kurima had simply failed to load.
  const twoSeasons = noTypical === 'two-seasons'
  if (!typical && !twoSeasons && !soFar) return null
  return (
    <div className="season-context" data-testid="season-context">
      {twoSeasons && (
        <p data-testid="two-seasons">
          There are <strong>two rainy seasons</strong> a year here. Kurima judges one season a year, so it does not
          say when the rains usually break at this place yet.
        </p>
      )}
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
          {/* The quartiles cover the middle half of past seasons, not "most"
              of them: half the time the rains break outside this window, and
              a farmer told "most years" would be wrong one season in two. */}
          <span className="muted">Half of past seasons: {nice(typical.from)} to {nice(typical.to)}.</span>
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
