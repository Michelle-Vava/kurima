// Build the climate packs for the pilot districts.
//
//   npx tsx scripts/build-packs.ts
//
// Fetches 1991–2020 daily rain for each district from the Open-Meteo archive
// (ERA5, CC BY 4.0) and runs it through the same climateFromSeries the app
// uses live, so a pack and the live path can never disagree. Rerun when the
// pilot list or the derivation changes; the output is committed.
import { mkdirSync, writeFileSync } from 'node:fs'
import { climateFromSeries, packSlug, type ClimatePack } from '../src/lib/climatePack'
import { PILOT_DISTRICTS, placeKey } from '../src/lib/places'

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
mkdirSync('src/lib/packs', { recursive: true })

for (const place of PILOT_DISTRICTS) {
  const url =
    `${ARCHIVE}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${place.name}: ${res.status}`)
  const d = (await res.json()) as { daily: { time: string[]; precipitation_sum: (number | null)[] } }
  const climate = climateFromSeries({ time: d.daily.time, values: d.daily.precipitation_sum })
  const pack: ClimatePack = {
    place: { name: place.name, latitude: place.latitude, longitude: place.longitude },
    key: placeKey(place),
    builtAt: new Date().toISOString().slice(0, 10),
    ...climate,
  }
  const file = `src/lib/packs/${packSlug(place.name)}.json`
  writeFileSync(file, JSON.stringify(pack))
  const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(1)
  console.log(`${file}  ${kb} KB  start month ${climate.startMonth}  onsets ${climate.onsetDoys.length}`)
}
