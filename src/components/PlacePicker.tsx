import { describePlace, PILOT_COUNTRY, PILOT_DISTRICTS, placeKey } from '../lib/places'
import type { Place } from '../lib/openMeteo'

interface Props {
  onSelect: (place: Place) => void
  onCancel?: () => void
}

/**
 * Choose a district from a fixed list.
 *
 * There was an Africa-wide search box here until 9 November. It was removed
 * on purpose: Kurima's planting rule has only been checked in these eight
 * districts, and a search box that reaches Cairo implies otherwise. Search
 * comes back in Milestone 5, when coverage levels are a real part of the
 * interface rather than a warning banner under an answer that has already
 * been given.
 *
 * The weather layer still works for any point on earth; nothing about that
 * changed, and the end-to-end tests still exercise other countries.
 */
export function PlacePicker({ onSelect, onCancel }: Props) {
  return (
    <div className="picker" data-testid="picker">
      <div className="picker-intro">
        <h2>Where do you farm?</h2>
        <p className="lead">
          Pick your district and Kurima will tell you whether this is a good time to plant, using the
          rain that has fallen there and the rain that is coming.
        </p>
        <p className="fine">
          These {PILOT_DISTRICTS.length} districts are where the planting rule is being checked against
          past seasons. More of {PILOT_COUNTRY}, and more countries, come later.
        </p>
      </div>

      <section className="picker-group">
        <h3 className="eyebrow">Choose a district</h3>
        <ul className="place-list">
          {PILOT_DISTRICTS.map((p) => (
            <li key={placeKey(p)}>
              <PlaceButton place={p} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      </section>

      {onCancel && (
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}

function PlaceButton({ place, onSelect }: { place: Place; onSelect: (p: Place) => void }) {
  return (
    <button type="button" className="place-btn" onClick={() => onSelect(place)}>
      <strong>{place.name}</strong>
      <span>{describePlace(place)}</span>
    </button>
  )
}
