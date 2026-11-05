import { useEffect, useRef, useState } from 'react'
import { PILOT_COUNTRY, PILOT_DISTRICTS } from '../lib/places'
import { searchPlaces, type Place } from '../lib/openMeteo'

interface Props {
  onSelect: (place: Place) => void
  onCancel?: () => void
  /** Places chosen before, most recent first. */
  recent?: Place[]
}

/**
 * Pick a district. Kurima's rules are checked for Zimbabwe first, so the
 * pilot districts are offered up front; search still reaches any town in
 * Africa, and anywhere outside the pilot is flagged on the screen itself.
 */
export function PlacePicker({ onSelect, onCancel, recent = [] }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(query, ctrl.signal)
        .then((r) => {
          setResults(r)
          setOpen(true)
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError('Search is unavailable right now.')
        })
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function choose(p: Place) {
    setQuery('')
    setResults([])
    setOpen(false)
    setError(null)
    onSelect(p)
  }

  return (
    <div className="search" ref={boxRef} data-testid="place-picker">
      <h2 className="picker-title">Choose your district</h2>
      {recent.length > 0 && (
        <div className="recent" data-testid="recent">
          <span className="label">Recent</span>
          <div className="chips">
            {recent.map((p) => (
              <button key={`${p.latitude},${p.longitude}`} className="chip" onClick={() => choose(p)}>
                <strong>{p.name}</strong>
                <span>{[p.region && p.region !== p.name ? p.region : null, p.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="chips">
        {PILOT_DISTRICTS.map((p) => (
          <button
            key={p.name}
            className="chip"
            aria-label={p.region && p.region !== p.name ? `${p.name}, ${p.region}` : p.name}
            onClick={() => choose(p)}
          >
            <strong>{p.name}</strong>
            {p.region && p.region !== p.name && <span>{p.region}</span>}
          </button>
        ))}
      </div>
      <p className="fine">
        These {PILOT_DISTRICTS.length} {PILOT_COUNTRY} districts are where Kurima's planting rule is being checked
        first, from the wetter north-east to the drier south-west.
      </p>

      <details className="elsewhere">
        <summary>Somewhere else in Africa</summary>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a town or village in Africa"
          aria-label="Search a town or village"
        />
        {open && results.length > 0 && (
          <ul className="results" role="listbox">
            {results.map((p) => (
              <li key={`${p.latitude},${p.longitude}`}>
                <button onClick={() => choose(p)}>
                  <strong>{p.name}</strong>
                  <span>{[p.region, p.country].filter(Boolean).join(', ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query.trim().length >= 2 && results.length === 0 && (
          <p className="hint">No places in Africa match "{query}".</p>
        )}
        {error && <p className="hint error">{error}</p>}
        <p className="fine">
          Weather works anywhere, but the planting rule has only been checked for {PILOT_COUNTRY} so far.
        </p>
      </details>

      {onCancel && (
        <button className="ghost" onClick={onCancel}>Cancel</button>
      )}
      <p className="privacy">
        Kurima only uses the district you pick to fetch weather. It never asks for your device's location, and nothing
        is stored or shared.
      </p>
    </div>
  )
}
