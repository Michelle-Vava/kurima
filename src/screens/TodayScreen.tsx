import { DataLabel } from '../components/DataLabel'
import { RainChart } from '../components/RainChart'
import { SignalCard } from '../components/SignalCard'
import { MAX_WEATHER_AGE_DAYS, ageInDays } from '../lib/freshness'
import { evaluateSignal, plural, splitAtToday, type OnsetRule } from '../lib/onset'
import type { Weather } from '../lib/openMeteo'
import type { Loaded } from '../lib/sources'
import { formatTemp, type Units } from '../lib/units'
import type { Async } from '../state/useSource'

interface Props {
  weather: Async<Weather>
  /** Long-term average rain for the current month, if the history loaded. */
  monthNormalMm: number | null
  rule: OnsetRule
  units: Units
  now: Date
}

export function TodayScreen({ weather, monthNormalMm, rule, units, now }: Props) {
  if (weather.status === 'loading' || weather.status === 'idle') {
    return <div className="card skeleton">Checking the rain…</div>
  }
  if (weather.status === 'error') return <div className="card error">{weather.message}</div>

  const loaded: Loaded<Weather> = weather.loaded
  const w = loaded.data
  const age = ageInDays(w.issued, now)

  if (age >= MAX_WEATHER_AGE_DAYS) {
    return (
      <section className="card stale" data-testid="stale">
        <h3>This forecast is {age} {plural(age, 'day')} old</h3>
        <p className="sub">
          It was issued for {w.issued} and the app could not fetch a newer one. Kurima does not give planting advice
          on a forecast more than {MAX_WEATHER_AGE_DAYS - 1} {plural(MAX_WEATHER_AGE_DAYS - 1, 'day')} old. Connect to
          the internet and reopen the app to refresh.
        </p>
        <DataLabel loaded={loaded} now={now} />
      </section>
    )
  }

  const { recent, forecast } = splitAtToday(w.rain, w.todayIndex)
  const signal = evaluateSignal(recent, forecast, monthNormalMm, rule)
  const tMax = w.tempMax?.[w.todayIndex]
  const tMin = w.tempMin?.[w.todayIndex]

  return (
    <>
      <SignalCard result={signal} soilMoisture={w.soilMoisture} units={units}>
        {Number.isFinite(tMax) && Number.isFinite(tMin) && (
          <p className="fine">
            Today: {formatTemp(tMax!, units.temp)} by day, {formatTemp(tMin!, units.temp)} at night.
          </p>
        )}
        <DataLabel loaded={loaded} now={now} />
      </SignalCard>
      <RainChart dates={w.dates} rain={w.rain} todayIndex={w.todayIndex} units={units}>
        <DataLabel loaded={loaded} now={now} />
      </RainChart>
    </>
  )
}
