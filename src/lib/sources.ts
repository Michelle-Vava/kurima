// The data-source layer.
//
// Every source answers the same question — "give me X for this place" — and
// returns the data together with who it came from and what date it speaks
// for. Screens read that metadata instead of knowing which API was called, so
// a sample dataset or a precomputed pack can replace a live API later without
// touching a screen.

import type { DailySeries } from './climate'
import { climateFromSeries, type Climate } from './climatePack'
import { loadPack } from './packLoader'
import { placeKey } from './places'
import {
  fetchHistory,
  fetchRainBetween,
  fetchSeasonal,
  fetchWeather,
  type Place,
  type SeasonalForecast,
  type Weather,
} from './openMeteo'

export interface SourceMeta {
  id: string
  /** Shown to the farmer, e.g. "Open-Meteo forecast". */
  label: string
  licence: string
  url: string
  /**
   * `live` comes from an API now; `bundled` is real data derived ahead of time
   * and shipped with the app; `sample` is a small stand-in and must always be
   * labelled as such.
   */
  kind: 'live' | 'bundled' | 'sample'
}

export interface Loaded<T> {
  data: T
  source: SourceMeta
  /** The date this data speaks for (YYYY-MM-DD), when it has one. */
  asOf?: string
  /** A fixed period, for data that does not age, e.g. "1991–2020". */
  period?: string
}

export interface DataSource<T> {
  meta: SourceMeta
  load(place: Place, signal?: AbortSignal): Promise<Loaded<T>>
}

const OPEN_METEO = { licence: 'CC BY 4.0', url: 'https://open-meteo.com/' }

export const forecastSource: DataSource<Weather> = {
  meta: { id: 'open-meteo-forecast', label: 'Open-Meteo forecast', kind: 'live', ...OPEN_METEO },
  async load(place, signal) {
    const data = await fetchWeather(place.latitude, place.longitude, signal)
    return { data, source: this.meta, asOf: data.issued }
  },
}

/**
 * Thirty years of climate, derived. A bundled pack for a pilot district, else
 * built in the browser from the live archive.
 */
export const climateSource: DataSource<Climate> = {
  meta: { id: 'climate', label: 'ERA5 reanalysis (Copernicus), via Open-Meteo', kind: 'live', ...OPEN_METEO },
  async load(place, signal) {
    const pack = await loadPack(place.name, placeKey(place))
    if (pack) {
      return {
        data: pack,
        source: { ...this.meta, kind: 'bundled', label: 'ERA5 reanalysis (Copernicus), bundled with the app' },
        period: pack.period,
      }
    }
    const series = await fetchHistory(place.latitude, place.longitude, signal)
    return { data: climateFromSeries(series), source: this.meta, period: '1991–2020' }
  },
}

/** Daily rain from `from` to `to` (YYYY-MM-DD), for this season so far. */
export function seasonRainSource(from: string, to: string): DataSource<DailySeries> {
  return {
    meta: { id: 'season-rain', label: 'ERA5 reanalysis (Copernicus), via Open-Meteo', kind: 'live', ...OPEN_METEO },
    async load(place, signal) {
      const data = await fetchRainBetween(place.latitude, place.longitude, from, to, signal)
      return { data, source: this.meta, asOf: data.time[data.time.length - 1] }
    },
  }
}

export const seasonalSource: DataSource<SeasonalForecast> = {
  meta: { id: 'ecmwf-seasonal', label: 'ECMWF seasonal ensemble, via Open-Meteo', kind: 'live', ...OPEN_METEO },
  async load(place, signal) {
    const data = await fetchSeasonal(place.latitude, place.longitude, signal)
    return { data, source: this.meta, asOf: data.dates[0] }
  },
}
