import { CalendarRange, CloudOff } from 'lucide-react'
import { CropWatchCard } from '../components/CropWatchCard'
import { DataLabel } from '../components/DataLabel'
import { SeasonContextNote } from '../components/SeasonContextNote'
import type { DailySeries } from '../lib/climate'
import type { Climate } from '../lib/climatePack'
import { cropById } from '../lib/crops'
import { seasonContext } from '../lib/seasonContext'
import { RainChart } from '../components/RainChart'
import { SignalCard } from '../components/SignalCard'
import { MAX_WEATHER_AGE_DAYS, ageInDays, localIsoDate } from '../lib/freshness'
import { evaluateSignal, plural, splitAtToday, type OnsetRule } from '../lib/onset'
import type { Weather } from '../lib/openMeteo'
import type { Loaded } from '../lib/sources'
import { formatTemp, type Units } from '../lib/units'
import { waterBalance } from '../lib/water'
import type { Async } from '../state/useSource'

interface Props {
  weather: Async<Weather>
  climate: Async<Climate>
  seasonRain: Async<DailySeries>
  /** Long-term average rain for the current month, if the history loaded. */
  monthNormalMm: number | null
  rule: OnsetRule
  units: Units
  now: Date
  crop: string
  plantedOn: string | null
}

export function TodayScreen({ weather, climate, seasonRain, monthNormalMm, rule, units, now, crop, plantedOn }: Props) {
  const chosen = cropById(crop)

  if (weather.status === 'loading' || weather.status === 'idle') {
    // Shaped like the card it is standing in for, so switching district reads
    // as the same screen refilling rather than everything vanishing.
    return (
      <section className="card signal signal-unknown skeleton" aria-busy="true" aria-label="Checking the rain">
        <div className="shimmer shimmer-title" />
        <div className="stats">
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer shimmer-stat" />)}
        </div>
        <div className="shimmer shimmer-line" />
        <div className="shimmer shimmer-line short" />
      </section>
    )
  }
  if (weather.status === 'error') return <div className="card error">{weather.message}</div>

  const loaded: Loaded<Weather> = weather.loaded
  const w = loaded.data
  const age = ageInDays(w.issued, now)
  const today = localIsoDate(now)
  const history = seasonRain.status === 'ok' ? seasonRain.loaded.data : null

  if (age >= MAX_WEATHER_AGE_DAYS) {
    return (
      <section className="card stale" data-testid="stale">
        <div className="signal-head">
          <span className="signal-icon" aria-hidden><CloudOff size={34} /></span>
          <div>
            <h2>This forecast is {age} {plural(age, 'day')} old</h2>
            <p>Kurima gives no planting advice on numbers this old.</p>
          </div>
        </div>
        <p className="sub">
          It was issued for {w.issued} and the app could not fetch a newer one. Connect to the internet and reopen the
          app to refresh.
        </p>
        <DataLabel loaded={loaded} now={now} />
      </section>
    )
  }

  const { recent, forecast } = splitAtToday(w.rain, w.todayIndex)
  const et0 = splitAtToday(w.et0, w.todayIndex)
  const hasEt0 = w.et0.length > 0
  const signal = evaluateSignal(
    {
      recentRain: recent,
      forecastRain: forecast,
      monthNormalMm,
      recentEt0: hasEt0 ? et0.recent : undefined,
      forecastEt0: hasEt0 ? et0.forecast : undefined,
      soilTempC: w.soilTempC[w.todayIndex] ?? null,
      rainProbability: w.rainProbability.slice(w.todayIndex),
    },
    rule,
  )
  const tMax = w.tempMax?.[w.todayIndex]
  const tMin = w.tempMin?.[w.todayIndex]

  const context =
    climate.status === 'ok'
      ? seasonContext(
          climate.loaded.data,
          today,
          history,
          w.dates.slice(0, w.todayIndex).map((d, i) => [d, w.rain[i]] as [string, number]),
        )
      : null

  return (
    <>
      {/* Left: the answer. Once the seed is in, the question is no longer
          "should I?" but "will it survive?", so the card changes rather than
          the wording. */}
      {plantedOn ? (
        <CropWatchCard
          crop={chosen}
          plantedOn={plantedOn}
          today={today}
          forecastRain={forecast}
          water={hasEt0 ? waterBalance(forecast, et0.forecast) : null}
          rule={rule}
          units={units}
        >
          <DataLabel loaded={loaded} now={now} />
        </CropWatchCard>
      ) : (
        <SignalCard result={signal} soilMoisture={w.soilMoisture} units={units} crop={chosen} rule={rule}>
          <DataLabel loaded={loaded} now={now} />
        </SignalCard>
      )}

      {/* Right: the evidence. */}
      <div className="stack">
        <RainChart dates={w.dates} rain={w.rain} todayIndex={w.todayIndex} units={units} history={history}>
          <DataLabel loaded={loaded} now={now} />
        </RainChart>
        {context && (
          <section className="card" data-testid="where-in-season">
            <h3><CalendarRange size={17} aria-hidden /> Where the season is</h3>
            <SeasonContextNote context={context} units={units} />
            {Number.isFinite(tMax) && Number.isFinite(tMin) && (
              <p className="fine">
                Today: {formatTemp(tMax!, units.temp)} by day, {formatTemp(tMin!, units.temp)} at night.
              </p>
            )}
          </section>
        )}
      </div>
    </>
  )
}
