import { useEffect, useMemo, useState } from 'react'
import { Nav } from './components/Nav'
import { PlacePicker } from './components/PlacePicker'
import { monthlyNormals, nextMonths } from './lib/climate'
import { describePlace, isPilotPlace, PILOT_COUNTRY } from './lib/places'
import { isTabId, type TabId } from './lib/tabs'
import { forecastSource, historySource, seasonalSource } from './lib/sources'
import { SeasonScreen } from './screens/SeasonScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'
import { useApp } from './state/appContext'
import { useNow } from './state/useNow'
import { useSource } from './state/useSource'

const OUTLOOK_MONTHS = 3

/** The tab lives in the URL hash, so a reload or a shared link keeps its place. */
function useHashTab(): [TabId, (tab: TabId) => void] {
  const read = (): TabId => {
    const h = window.location.hash.replace('#', '')
    return isTabId(h) ? h : 'today'
  }
  const [tab, setTab] = useState<TabId>(read)
  useEffect(() => {
    const onHash = () => setTab(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return [
    tab,
    (next) => {
      window.location.hash = next
      setTab(next)
    },
  ]
}

export default function App() {
  const { place, setPlace, units, setUnits, rule, setRule } = useApp()
  const [tab, setTab] = useHashTab()
  const [changing, setChanging] = useState(false)

  // Loaded once here rather than per screen, so switching tabs never refetches.
  const weather = useSource(forecastSource, place)
  const history = useSource(historySource, place)
  const seasonal = useSource(seasonalSource, place)

  const now = useNow()
  const normals = useMemo(
    () => (history.status === 'ok' ? monthlyNormals(history.loaded.data) : null),
    [history],
  )
  // The outlook window only changes when the month does, so it is keyed on
  // the month rather than recomputed every time the clock ticks.
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const outlookMonths = useMemo(() => nextMonths(now, OUTLOOK_MONTHS), [monthKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const picking = !place || changing

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>🌾</span>
          <div>
            <h1>Kurima</h1>
            <p>Planting and rainfall guidance for farmers in {PILOT_COUNTRY}</p>
          </div>
        </div>
      </header>

      <main>
        {picking && (
          <PlacePicker
            onSelect={(p) => {
              setPlace(p)
              setChanging(false)
            }}
            onCancel={place ? () => setChanging(false) : undefined}
          />
        )}

        {place && !picking && (
          <>
            <div className="place">
              <div>
                <h2>{place.name}</h2>
                <span>{describePlace(place)}</span>
              </div>
              <button className="ghost" onClick={() => setChanging(true)}>Change district</button>
            </div>

            {!isPilotPlace(place) && (
              <p className="notice" data-testid="not-checked">
                Kurima's planting rule has not been checked for {place.country || 'this country'} yet. The weather is
                right, but treat the plant-or-wait answer as a rough guide and follow your own extension officer.
              </p>
            )}

            <Nav tab={tab} onChange={setTab} />

            {tab === 'today' && (
              <TodayScreen
                weather={weather}
                monthNormalMm={normals ? normals[now.getMonth()] : null}
                rule={rule}
                units={units}
                now={now}
              />
            )}
            {tab === 'season' && (
              <SeasonScreen
                history={history}
                seasonal={seasonal}
                outlookMonths={outlookMonths}
                units={units}
                now={now}
              />
            )}
            {tab === 'settings' && (
              <SettingsScreen rule={rule} units={units} onRuleChange={setRule} onUnitsChange={setUnits} />
            )}
          </>
        )}
      </main>

      <footer>
        <p>
          <strong>Guidance only.</strong> Always follow your national meteorological service and agricultural extension
          officers.
        </p>
        <p>
          Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC
          BY 4.0) · historical data from ERA5 (Copernicus) · seasonal forecasts from ECMWF.
        </p>
      </footer>
    </div>
  )
}
