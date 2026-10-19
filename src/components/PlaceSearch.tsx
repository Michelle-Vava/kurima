import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type Place } from '../lib/openMeteo'

const QUICK_PICKS: Place[] = [
  { name: 'Kano', country: 'Nigeria', countryCode: 'NG', latitude: 12.0, longitude: 8.52 },
  { name: 'Kisumu', country: 'Kenya', countryCode: 'KE', latitude: -0.1, longitude: 34.76 },
  { name: 'Kumasi', country: 'Ghana', countryCode: 'GH', latitude: 6.69, longitude: -1.62 },
  { name: 'Lilongwe', country: 'Malawi', countryCode: 'MW', latitude: -13.97, longitude: 33.79 },
  { name: 'Harare', country: 'Zimbabwe', countryCode: 'ZW', latitude: -17.83, longitude: 31.05 },
  { name: 'Bamako', country: 'Mali', countryCode: 'ML', latitude: 12.65, longitude: -8.0 },
]

interface Props {
  onSelect: (place: Place) => void
}

export function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
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
        .catch((e) => {
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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Your browser cannot share a location.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        choose({
          name: 'My location',
          country: '',
          countryCode: '',
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
        })
      },
      () => {
        setLocating(false)
        setError('Location was not shared. Search for your town instead.')
      },
      { timeout: 10000 },
    )
  }

  return (
    <div className="search" ref={boxRef}>
      <div className="search-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search a town or village in Africa"
          aria-label="Search a town or village"
        />
        <button className="ghost" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Locating…' : '📍 Use my location'}
        </button>
      </div>

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

      <div className="chips">
        {QUICK_PICKS.map((p) => (
          <button key={p.name} className="chip" onClick={() => choose(p)}>
            {p.name}, {p.country}
          </button>
        ))}
      </div>
      <p className="privacy">Your location is only used to fetch weather. Nothing is stored or shared.</p>
    </div>
  )
}
