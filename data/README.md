# The ERA5 data pipeline

One raw folder, read by one script, writing three small committed outputs. Nothing else — not
the app, not the tests, not the future simulator — ever reads the raw folder.

```
npx tsx scripts/build-data.ts                    # rebuild everything
npx tsx scripts/build-data.ts --only packs       # or: simulator | slices
npx tsx scripts/build-data.ts --src /other/path  # folder somewhere else
```

The script **never fetches**. It reads `~/kurima-era5` (or `--src`), reports every input file it
cannot use by name, writes what it can, and exits non-zero if anything was unusable. The
transforms live in `src/lib/era5.ts` and are unit-tested; the script is I/O glue around them.

## The raw folder

`~/kurima-era5/` holds Open-Meteo **archive API** responses (ERA5, CC BY 4.0), saved as fetched,
one place per file. 16 places: the 8 Zimbabwe pilot districts plus Addis Ababa, Aswan,
Cape Town, Kano, Kisumu, Lilongwe, Mbandaka and Windhoek.

| Path | Contents | Period |
|---|---|---|
| `<Place>.json` | daily `precipitation_sum` | 1991-01-01 – 2020-12-31 |
| `et0-tmax/<Place>.json` | daily `et0_fao_evapotranspiration`, `temperature_2m_max` | 1991-01-01 – 2020-12-31 |
| `recent/<Place>.json` | daily rain + et0 + tmax | 2021-01-01 – latest |
| `soil/<Place>-<decade>.json` | hourly soil temp + moisture | pilot districts, decades 1991 / 2001 / 2011 |

Place names in filenames have spaces and punctuation stripped (`AddisAbaba.json`). To refetch a
file, request the same range from `archive-api.open-meteo.com/v1/archive` and save the body
as-is.

## The outputs

| Output | For | Shape |
|---|---|---|
| `src/lib/packs/*.json` | the app, bundled | `ClimatePack` through the same `climateFromSeries` the live path uses, so a pack can never disagree with it. ~11 KB each, with the season audit fields. |
| `data/simulator/*.json` | the season simulator, when it is built | `SimSeries` (`src/lib/era5.ts`): daily rain / et0 / tmax from 1991 to the folder's latest day, dates implied by `from`; pilot districts also get daily-mean soil temperature and moisture. Read back with `simField()`. |
| `src/lib/fixtures/era5/*.json` | tests | Short, named slices of real weather, each there because a test tells a story about it (the 2015 Harare false start, the 2017 start that held, Kisumu's two seasons in 1997). Consumed by `src/lib/era5-slices.test.ts`. |

A missing reading is `null` everywhere, never `0`: the simulator inherits the same "unknown is
not dry" rule as the app (`src/lib/series.ts`). Hourly soil becomes a daily mean only when at
least 20 of 24 hours are present.

## When to rerun

- The raw folder changed (a file refetched, `recent/` extended, a place added).
- The pack derivation changed (`climateFromSeries` or anything under it).
- A test wants a new slice: add it to `SLICES` in `scripts/build-data.ts` with a `why`.

Rebuilding from unchanged inputs is idempotent except each pack's `builtAt` date. The outputs
are committed; review the diff like code.
