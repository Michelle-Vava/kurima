import { useEffect, useMemo, useState } from 'react'
import { FieldBar } from './components/FieldBar'
import { Nav } from './components/Nav'
import { PlacePicker } from './components/PlacePicker'
import { nextMonths } from './lib/climate'
import { localIsoDate } from './lib/freshness'
import { addDays, seasonStart, seasonYearOf } from './lib/season'
import { isPilotPlace, PILOT_COUNTRY } from './lib/places'
import { isTabId, needsPlace, sectionOf, type TabId } from './lib/tabs'
import { climateSource, forecastSource, seasonRainSource, seasonalSource } from './lib/sources'
import { AboutScreen } from './screens/AboutScreen'
import { SeasonScreen } from './screens/SeasonScreen'
import { SoonScreen } from './screens/SoonScreen'
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
  const { place, setPlace, units, setUnits, rule, setRule, crop, setCrop, plantedOn, setPlantedOn, theme, setTheme } = useApp()
  const [tab, setTab] = useHashTab()
  const [changing, setChanging] = useState(false)

  // Loaded once here rather than per screen, so switching tabs never refetches.
  const weather = useSource(forecastSource, place)
  const climate = useSource(climateSource, place)
  const seasonal = useSource(seasonalSource, place)

  const now = useNow()
  const today = localIsoDate(now)
  const normals = climate.status === 'ok' ? climate.loaded.data.normals : null

  // This season's rain so far, from the first day of the farming year to
  // yesterday. The archive lags a few days; the forecast's completed days fill
  // the gap in TodayScreen.
  const startMonth = climate.status === 'ok' ? climate.loaded.data.startMonth : null
  const seasonFrom = startMonth ? seasonStart(seasonYearOf(today, startMonth), startMonth) : null
  const yesterday = addDays(today, -1)
  const rainSource = useMemo(
    () => (seasonFrom ? seasonRainSource(seasonFrom, yesterday) : null),
    [seasonFrom, yesterday],
  )
  const seasonRain = useSource(rainSource, place)
  // The outlook window only changes when the month does, so it is keyed on
  // the month rather than recomputed every time the clock ticks.
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const outlookMonths = useMemo(() => nextMonths(now, OUTLOOK_MONTHS), [monthKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // The picker takes the whole screen until a place is chosen; after that it
  // is only shown on request. Sections that do not depend on a place — About,
  // Settings — stay reachable either way, so a first-time visitor can read
  // what Kurima is before being asked for anything.
  const section = sectionOf(tab)
  const picking = changing || (!place && needsPlace(tab))

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>🌾</span>
          <div>
            <h1>Kurima</h1>
            <p>Planting guidance for rain-fed farmers in {PILOT_COUNTRY}</p>
          </div>
        </div>
      </header>

      <Nav tab={tab} onChange={setTab} />

      {place && !picking && (
        <FieldBar
          place={place}
          crop={crop}
          plantedOn={plantedOn}
          today={today}
          busy={weather.status === 'loading'}
          onPlace={setPlace}
          onCrop={setCrop}
          onPlanted={setPlantedOn}
        />
      )}

      <main className={place && (tab === 'today' || tab === 'season') ? 'two-col' : undefined}>
        {picking && (
          <PlacePicker
            onSelect={(p) => {
              setPlace(p)
              setChanging(false)
            }}
            onCancel={place ? () => setChanging(false) : undefined}
          />
        )}

        {!picking && (
          <>
            {place && !isPilotPlace(place) && (
              <p className="notice" data-testid="not-checked">
                Kurima's planting rule has not been checked for {place.country || 'this country'} yet. The weather is
                right, but treat the plant-or-wait answer as a rough guide and follow your own extension officer.
              </p>
            )}

            {section?.status === 'soon' && <SoonScreen section={section} />}
            {tab === 'about' && <AboutScreen />}

            {place && tab === 'today' && (
              <TodayScreen
                weather={weather}
                climate={climate}
                seasonRain={seasonRain}
                monthNormalMm={normals ? normals[now.getMonth()] : null}
                rule={rule}
                units={units}
                now={now}
                crop={crop}
                plantedOn={plantedOn}
              />
            )}
            {place && tab === 'season' && (
              <SeasonScreen
                climate={climate}
                seasonal={seasonal}
                seasonRain={seasonRain}
                outlookMonths={outlookMonths}
                units={units}
                now={now}
              />
            )}
            {tab === 'settings' && (
              <SettingsScreen
                rule={rule}
                units={units}
                theme={theme}
                onRuleChange={setRule}
                onUnitsChange={setUnits}
                onThemeChange={setTheme}
              />
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
