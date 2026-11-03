import { useEffect, useMemo, useState } from 'react'
import { NormalsChart } from './components/NormalsChart'
import { DrySeasonCard, OutlookCard } from './components/OutlookCard'
import { PlaceSearch } from './components/PlaceSearch'
import { RainChart } from './components/RainChart'
import { RuleSettings } from './components/RuleSettings'
import { SignalCard } from './components/SignalCard'
import {
  isDrySeasonWindow,
  monthlyNormals,
  nextMonths,
  percentile,
  seasonTotalsByYear,
  tercileOutlook,
  type DailySeries,
  type Outlook,
} from './lib/climate'
import { MAX_WEATHER_AGE_DAYS, ageInDays } from './lib/freshness'
import { DEFAULT_RULE, evaluateSignal, plural, splitAtToday, type OnsetRule } from './lib/onset'
import {
  fetchHistory,
  fetchSeasonal,
  fetchWeather,
  memberTotals,
  type Place,
  type SeasonalForecast,
  type Weather,
} from './lib/openMeteo'

type Load<T> = { status: 'idle' | 'loading' } | { status: 'ok'; data: T } | { status: 'error'; message: string }

function useLoad<T>(place: Place | null, fn: (lat: number, lon: number, s: AbortSignal) => Promise<T>): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: 'idle' })
  useEffect(() => {
    if (!place) return
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    fn(place.latitude, place.longitude, ctrl.signal)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ status: 'error', message: e.message || 'Could not load data.' })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.latitude, place?.longitude])
  return state
}

const OUTLOOK_MONTHS = 3

type SeasonView = { kind: 'outlook'; outlook: Outlook } | { kind: 'dry'; normalMm: number } | null

export default function App() {
  const [place, setPlace] = useState<Place | null>(null)
  const [rule, setRule] = useState<OnsetRule>(DEFAULT_RULE)

  const weather = useLoad<Weather>(place, fetchWeather)
  const history = useLoad<DailySeries>(place, fetchHistory)
  const seasonal = useLoad<SeasonalForecast>(place, fetchSeasonal)

  const now = new Date()
  const normals = useMemo(() => (history.status === 'ok' ? monthlyNormals(history.data) : null), [history])

  // A cached forecast is fine for a day; after that the "today" it was built
  // around is wrong and the recommendation is hidden.
  const weatherAge = weather.status === 'ok' ? ageInDays(weather.data.issued, now) : 0
  const tooOld = weatherAge >= MAX_WEATHER_AGE_DAYS

  const signal = useMemo(() => {
    if (weather.status !== 'ok') return null
    const { recent, forecast } = splitAtToday(weather.data.rain, weather.data.todayIndex)
    return evaluateSignal(recent, forecast, normals ? normals[now.getMonth()] : null, rule)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, normals, rule])

  const outlookMonths = useMemo(() => nextMonths(now, OUTLOOK_MONTHS), []) // eslint-disable-line react-hooks/exhaustive-deps
  const season = useMemo<SeasonView>(() => {
    if (history.status !== 'ok' || seasonal.status !== 'ok') return null
    const past = seasonTotalsByYear(history.data, outlookMonths)
    if (past.length < 10) return null
    if (isDrySeasonWindow(past)) return { kind: 'dry', normalMm: Math.round(percentile(past, 0.5)) }
    const members = memberTotals(seasonal.data, outlookMonths)
    if (members.length === 0) return null
    return { kind: 'outlook', outlook: tercileOutlook(past, members) }
  }, [history, seasonal, outlookMonths])

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>🌾</span>
          <div>
            <h1>Kurima</h1>
            <p>Planting and rainfall guidance for farmers across Africa</p>
          </div>
        </div>
      </header>

      <main>
        <PlaceSearch onSelect={setPlace} />

        {!place && (
          <section className="card intro">
            <h2>Should I plant yet?</h2>
            <p>
              Pick your town to see recent (modelled) and forecast rain, a plant-or-wait signal, how the coming season
              compares with normal, and what rainfall is usual here, all from free satellite and weather-model data.
            </p>
          </section>
        )}

        {place && (
          <>
            <div className="place">
              <h2>{place.name}</h2>
              <span>
                {[place.region, place.country].filter(Boolean).join(', ')} · {place.latitude.toFixed(2)},{' '}
                {place.longitude.toFixed(2)}
              </span>
            </div>

            {weather.status === 'loading' && <div className="card skeleton">Checking the rain…</div>}
            {weather.status === 'error' && <div className="card error">{weather.message}</div>}
            {weather.status === 'ok' && tooOld && (
              <section className="card stale" data-testid="stale">
                <h3>This forecast is {weatherAge} {plural(weatherAge, 'day')} old</h3>
                <p className="sub">
                  It was issued for {weather.data.issued} and the app could not fetch a newer one. Kurima does not give
                  planting advice on a forecast more than {MAX_WEATHER_AGE_DAYS - 1}{' '}
                  {plural(MAX_WEATHER_AGE_DAYS - 1, 'day')} old. Connect to the internet and reopen the app to refresh.
                </p>
              </section>
            )}
            {weather.status === 'ok' && !tooOld && signal && (
              <>
                <SignalCard
                  result={signal}
                  soilMoisture={weather.data.soilMoisture}
                  issued={weather.data.issued}
                  ageDays={weatherAge}
                />
                <RainChart dates={weather.data.dates} rain={weather.data.rain} todayIndex={weather.data.todayIndex} />
              </>
            )}

            <RuleSettings rule={rule} onChange={setRule} />

            {(history.status === 'loading' || seasonal.status === 'loading') && (
              <div className="card skeleton">Comparing with 30 years of history…</div>
            )}
            {season?.kind === 'outlook' && seasonal.status === 'ok' && (
              <OutlookCard outlook={season.outlook} months={outlookMonths} memberCount={seasonal.data.members.length} />
            )}
            {season?.kind === 'dry' && <DrySeasonCard months={outlookMonths} normalMm={season.normalMm} />}
            {seasonal.status === 'error' && <div className="card error">Season outlook unavailable: {seasonal.message}</div>}

            {normals && <NormalsChart normals={normals} currentMonth={now.getMonth()} />}
            {history.status === 'error' && <div className="card error">History unavailable: {history.message}</div>}
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
