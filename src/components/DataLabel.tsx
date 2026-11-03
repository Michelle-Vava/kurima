import { ageInDays } from '../lib/freshness'
import { plural } from '../lib/onset'
import type { Loaded } from '../lib/sources'

interface Props {
  loaded: Loaded<unknown>
  now: Date
}

/** Where a card's data came from and how old it is. Used on every screen. */
export function DataLabel({ loaded, now }: Props) {
  const { source, asOf, period } = loaded
  const age = asOf ? ageInDays(asOf, now) : null

  return (
    <p className="fine data-label">
      {source.kind === 'sample' && <span className="badge-sample">Sample data</span>}{' '}
      <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> ({source.licence})
      {period && ` · ${period}`}
      {age !== null && ` · ${age === 0 ? 'issued today' : `${age} ${plural(age, 'day')} old`}`}
    </p>
  )
}
