// Distil the local ERA5 folder into the small files the repo actually uses.
//
//   npx tsx scripts/build-data.ts                 # everything
//   npx tsx scripts/build-data.ts --src /path     # folder other than the default
//   npx tsx scripts/build-data.ts --only packs    # packs | simulator | slices
//
// Reads ~77 MB of raw Open-Meteo archive responses once and writes three
// small, committed outputs, so nothing else ever needs the folder:
//
//   src/lib/packs/*.json          climate packs the app ships (pilot districts)
//   data/simulator/*.json         one merged daily series per place, 1991 to the
//                                 folder's latest day, for the Stage 5 simulator
//   src/lib/fixtures/era5/*.json  short real slices for tests
//
// The folder it reads holds Open-Meteo archive responses (ERA5, CC BY 4.0)
// saved as fetched, one file per place:
//
//   <Place>.json             daily precipitation_sum, 1991-01-01..2020-12-31
//   et0-tmax/<Place>.json    daily et0_fao_evapotranspiration + temperature_2m_max, same period
//   recent/<Place>.json      daily rain + et0 + tmax, 2021-01-01..latest
//   soil/<Place>-<decade>.json  hourly soil temp + moisture, pilot districts, decades 1991/2001/2011
//
// Place names have spaces and punctuation stripped (AddisAbaba.json). To
// refetch one, request the same range from archive-api.open-meteo.com and
// save the body as-is.
//
// The script never fetches. If the folder is missing something it says so and
// carries on; a corrupt file (a download that saved its error message as
// JSON) is reported by name and never skipped in silence. Rerun when the
// folder changes, when the pack derivation changes, or when a test wants a
// new slice (add it to SLICES below).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { climateFromSeries, packSlug, type ClimatePack } from '../src/lib/climatePack.ts'
import {
  coverageOf,
  mergeDaily,
  parseArchiveDaily,
  parseArchiveHourly,
  roundAll,
  sliceDaily,
  type SimSeries,
} from '../src/lib/era5.ts'
import { PILOT_DISTRICTS, placeKey } from '../src/lib/places.ts'
import type { DailySeries } from '../src/lib/climate.ts'

const args = process.argv.slice(2)
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const SRC = flag('--src') ?? `${process.env.HOME}/kurima-era5`
const only = flag('--only')

if (!existsSync(SRC)) {
  console.error(`No data folder at ${SRC}. See the comment at the top of this file for what goes in it.`)
  process.exit(1)
}

const problems = new Set<string>()
const report: string[] = []

/** Read and parse one archive file, recording rather than throwing per-place problems. */
function readArchive<T>(path: string, parse: (raw: unknown) => T): T | null {
  if (!existsSync(path)) {
    problems.add(`${rel(path)}: missing`)
    return null
  }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    problems.add(`${rel(path)}: not JSON — ${readFileSync(path, 'utf8').slice(0, 80)}`)
    return null
  }
  try {
    return parse(raw)
  } catch (e) {
    problems.add(`${rel(path)}: ${(e as Error).message}`)
    return null
  }
}

function rel(path: string): string {
  return path.startsWith(SRC) ? path.slice(SRC.length + 1) : path
}

/** "AddisAbaba" on disk, from any place name. */
function fileStem(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '')
}

const PLACES = readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .map((f) => basename(f, '.json'))
  .sort()

function rainOf(stem: string): DailySeries | null {
  const d = readArchive(join(SRC, `${stem}.json`), (raw) => parseArchiveDaily(raw, ['precipitation_sum']))
  return d && { time: d.time, values: d.values.precipitation_sum }
}

// ── Packs: what the app ships for the pilot districts ──────────────────────

if (!only || only === 'packs') {
  for (const place of PILOT_DISTRICTS) {
    const series = rainOf(fileStem(place.name))
    if (!series) continue
    const pack: ClimatePack = {
      place: { name: place.name, latitude: place.latitude, longitude: place.longitude },
      key: placeKey(place),
      builtAt: new Date().toISOString().slice(0, 10),
      ...climateFromSeries(series),
    }
    const file = `src/lib/packs/${packSlug(place.name)}.json`
    writeFileSync(file, JSON.stringify(pack))
    report.push(
      `${file}  ${(JSON.stringify(pack).length / 1024).toFixed(1)} KB  onsets ${pack.onsetDoys.length}` +
        `, no onset ${pack.seasonsWithoutOnset}, unjudgeable ${pack.seasonsIncomplete}`,
    )
  }
}

// ── Simulator: one merged daily series per place ────────────────────────────

if (!only || only === 'simulator') {
  mkdirSync('data/simulator', { recursive: true })
  const manifest: object[] = []
  for (const stem of PLACES) {
    const base = readArchive(join(SRC, `${stem}.json`), (raw) => parseArchiveDaily(raw, ['precipitation_sum']))
    const et = readArchive(join(SRC, 'et0-tmax', `${stem}.json`), (raw) =>
      parseArchiveDaily(raw, ['et0_fao_evapotranspiration', 'temperature_2m_max']),
    )
    const recent = readArchive(join(SRC, 'recent', `${stem}.json`), (raw) =>
      parseArchiveDaily(raw, ['precipitation_sum', 'et0_fao_evapotranspiration', 'temperature_2m_max']),
    )
    if (!base || !et || !recent) continue

    const rain = mergeDaily([
      { time: base.time, values: base.values.precipitation_sum },
      { time: recent.time, values: recent.values.precipitation_sum },
    ])
    const et0 = mergeDaily([
      { time: et.time, values: et.values.et0_fao_evapotranspiration },
      { time: recent.time, values: recent.values.et0_fao_evapotranspiration },
    ])
    const tmax = mergeDaily([
      { time: et.time, values: et.values.temperature_2m_max },
      { time: recent.time, values: recent.values.temperature_2m_max },
    ])

    // Hourly soil, pilot districts only, one file per decade. A decade whose
    // file is corrupt stays null for its 3,653 days and is reported above.
    const soilParts: { temp: DailySeries; moist: DailySeries }[] = []
    for (const decade of [1991, 2001, 2011]) {
      const path = join(SRC, 'soil', `${stem}-${decade}.json`)
      if (!existsSync(path)) continue
      const temp = readArchive(path, (raw) => parseArchiveHourly(raw, 'soil_temperature_0_to_7cm'))
      const moist = readArchive(path, (raw) => parseArchiveHourly(raw, 'soil_moisture_0_to_7cm'))
      if (temp && moist) soilParts.push({ temp, moist })
    }
    const soilTemp = mergeDaily(soilParts.map((p) => p.temp))
    const soilMoist = mergeDaily(soilParts.map((p) => p.moist))

    const sim: SimSeries = {
      place: stem,
      latitude: base.latitude,
      longitude: base.longitude,
      from: rain.time[0],
      to: rain.time[rain.time.length - 1],
      rain: roundAll(rain.values, 1),
      et0: roundAll(et0.values, 1),
      tmaxC: roundAll(tmax.values, 1),
      ...(soilParts.length > 0 && {
        soilTempC: roundAll(sliceDaily(soilTemp, rain.time[0], rain.time[rain.time.length - 1]).values, 1),
        soilMoisture: roundAll(sliceDaily(soilMoist, rain.time[0], rain.time[rain.time.length - 1]).values, 3),
      }),
    }
    const file = `data/simulator/${packSlug(stem)}.json`
    writeFileSync(file, JSON.stringify(sim))

    const cov = coverageOf(rain)
    const soilCov = soilParts.length > 0 ? coverageOf(soilTemp) : null
    manifest.push({
      place: stem,
      file: `${packSlug(stem)}.json`,
      from: sim.from,
      to: sim.to,
      rainDays: cov,
      ...(soilCov && { soilDays: soilCov }),
    })
    report.push(
      `${file}  ${(JSON.stringify(sim).length / 1024).toFixed(0)} KB  ${sim.from}..${sim.to}` +
        `  rain ${cov.have}/${cov.want}${soilCov ? `  soil ${soilCov.have}/${soilCov.want}` : ''}`,
    )
  }
  writeFileSync(
    'data/simulator/manifest.json',
    JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), source: 'ERA5 via Open-Meteo archive (CC BY 4.0)', places: manifest }, null, 2),
  )
}

// ── Slices: short real stretches for tests ──────────────────────────────────
//
// Each is a named window of real weather chosen because a test tells a story
// about it. Keep them short; a slice is an exhibit, not a dataset.

const SLICES: { name: string; place: string; from: string; to: string; why: string }[] = [
  {
    name: 'harare-2015-trap',
    place: 'Harare',
    from: '2015-10-01',
    to: '2016-01-31',
    why: 'The classic false start: ~27 mm around 21 Nov 2015, then a killing dry spell. docs/how-it-works.md tells this story; the test pins it to the data.',
  },
  {
    name: 'harare-2017-good',
    place: 'Harare',
    from: '2017-10-01',
    to: '2018-01-31',
    why: 'The counter-example: the late-Nov 2017 onset rain held, and a crop planted on it did fine.',
  },
  {
    name: 'kisumu-1997',
    place: 'Kisumu',
    from: '1997-01-01',
    to: '1997-12-31',
    why: 'One full bimodal year: long rains around March–May, short rains late in the year.',
  },
]

if (!only || only === 'slices') {
  mkdirSync('src/lib/fixtures/era5', { recursive: true })
  for (const s of SLICES) {
    const rain = rainOf(fileStem(s.place))
    if (!rain) continue
    const cut = sliceDaily(rain, s.from, s.to)
    const file = `src/lib/fixtures/era5/${s.name}.json`
    writeFileSync(
      file,
      JSON.stringify({
        place: s.place,
        why: s.why,
        source: 'ERA5 via Open-Meteo archive (CC BY 4.0); real data, do not edit by hand',
        time: cut.time,
        rain: roundAll(cut.values, 1),
      }),
    )
    report.push(`${file}  ${cut.time.length} days`)
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

for (const line of report) console.log(line)
if (problems.size > 0) {
  console.error(`\n${problems.size} input file(s) could not be used:`)
  for (const p of problems) console.error(`  ${p}`)
  console.error('Each is a gap in the committed output, not a crash. Refetch them and rerun.')
  process.exitCode = 2
}
