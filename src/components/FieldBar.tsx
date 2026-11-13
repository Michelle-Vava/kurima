import { MapPin, Sprout, Undo2 } from 'lucide-react'
import { CROPS, cropById } from '../lib/crops'
import { addDays, daysBetween, shortDate } from '../lib/dates'
import type { Place } from '../lib/openMeteo'
import { describePlace, isPilotPlace, PILOT_DISTRICTS, placeKey } from '../lib/places'
import { Menu } from './Menu'

interface Props {
  place: Place
  crop: string
  plantedOn: string | null
  today: string
  /** True while the new district's weather is still on its way. */
  busy?: boolean
  onPlace: (p: Place) => void
  onCrop: (id: string) => void
  onPlanted: (date: string | null) => void
}

/**
 * The three things every answer below depends on: where, what, and whether
 * it is already in the ground.
 *
 * They sit together in one bar at the top because they are one thought —
 * "my field" — and because the answer should visibly belong to them. Before
 * this, the crop was not named anywhere at all, so "Too dry to plant" was
 * advice about maize that never said the word maize.
 */
export function FieldBar({ place, crop, plantedOn, today, busy = false, onPlace, onCrop, onPlanted }: Props) {
  const chosen = cropById(crop)
  const age = plantedOn ? daysBetween(plantedOn, today) : null

  // A place kept from an older version of the app — or, later, found through
  // search — may not be one of the pilot districts. It still has to have a
  // name in the menu: a district that shows as "—" looks broken, and the
  // farmer is given no way to understand or change it.
  const districts = PILOT_DISTRICTS.some((p) => placeKey(p) === placeKey(place))
    ? PILOT_DISTRICTS
    : [place, ...PILOT_DISTRICTS]

  return (
    <div className="fieldbar">
      <Menu
        testId="district-menu"
        label="District"
        busy={busy}
        value={placeKey(place)}
        icon={<MapPin size={17} aria-hidden />}
        onChange={(key) => {
          const next = districts.find((p) => placeKey(p) === key)
          if (next) onPlace(next)
        }}
        options={districts.map((p) => ({
          id: placeKey(p),
          label: p.name,
          detail: describePlace(p),
          tag: isPilotPlace(p) ? undefined : 'not checked',
        }))}
        footer={<p className="menu-note">Only districts where the planting rule is being checked. More later.</p>}
      />

      <Menu
        testId="crop-menu"
        label="Crop"
        value={chosen.id}
        icon={<Sprout size={17} aria-hidden />}
        onChange={onCrop}
        options={CROPS.map((c) => ({
          id: c.id,
          label: c.name,
          detail: `${c.daysToMaturity} days to harvest`,
          tag: c.checked ? undefined : 'not checked',
        }))}
        footer={<p className="menu-note">{chosen.note}</p>}
      />

      <div className="planted">
        {plantedOn ? (
          <>
            <span className="planted-state">
              <strong>Planted {age === 0 ? 'today' : `${age} ${age === 1 ? 'day' : 'days'} ago`}</strong>
              <small>{chosen.name}, sown {shortDate(plantedOn)}</small>
            </span>
            <button type="button" className="ghost small" onClick={() => onPlanted(null)}>
              <Undo2 size={14} aria-hidden /> Not yet
            </button>
          </>
        ) : (
          <>
            <span className="planted-state">
              <strong>Not planted yet</strong>
              <small>Tell Kurima once you sow</small>
            </span>
            <button type="button" className="ghost small" onClick={() => onPlanted(today)}>
              <Sprout size={14} aria-hidden /> I have planted
            </button>
          </>
        )}
        {plantedOn && (
          <label className="planted-date">
            <span className="sr-only">Date sown</span>
            <input
              type="date"
              value={plantedOn}
              max={today}
              min={addDays(today, -200)}
              onChange={(e) => e.target.value && onPlanted(e.target.value)}
            />
          </label>
        )}
      </div>
    </div>
  )
}

