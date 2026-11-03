# Kurima Roadmap

> **This file is the ambition, not the order of work.** It lists everything Kurima should
> eventually do, grouped by subject. For what is being built next and why, see
> [BUILD-ORDER.md](BUILD-ORDER.md), which deliberately cuts across these milestones.

Kurima helps farmers across Africa make better decisions through the season: when to plant, what to expect from the rains, what their soil needs, where to sell, and how to keep what they harvest. Everything runs on free, open data with no accounts and no personal data.

## Status at a glance

```
  Milestone 1  Weather and planting    ████████████░░░░░░░░░░░░░░░░░░   18/45 + 9 already built   NEXT
    ├─ Phase 1  Trust the signal       ██████████████████████████████   12/12 done 2 Nov 2026 (redeploy pending)
    ├─ Phase 2  Season smarts          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/12  calibrated outlook, season simulator
    ├─ Phase 3  Restructure            ██████████████████████████████   6/6   done 2 Nov 2026
    ├─ Phase 4  Worth opening          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/9   water balance, soil temp, dashboard   NEXT
    └─ Phase 5  More weather           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/5   heat stress, rain map, compare, replay
  Milestone 2  Soil and inputs         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/8   soil, fertiliser, seed, will it pay?
  Milestone 3  Crops and pests         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/10  crop planner, pest guide
  Milestone 4  After harvest           ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/8   storage, markets, price simulator
  Milestone 5  Any place in Africa     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/9   one picker, coverage, ZW districts
  Milestone 6  More countries          █████░░░░░░░░░░░░░░░░░░░░░░░░░   1/6   Zimbabwe, then southern, east, west
  Milestone 7  Reach                   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/9   languages, low data, mobile app
```
Each block of the bar is about 3% of that row. Update the counts when items are ticked.

## How this roadmap is organised
- **Milestones** are the big areas, done in order: weather first, then soil, crops, after harvest, more countries, reach.
- **Phases** are the steps inside a milestone. Each phase ends with a *Done when*, which includes its tests.
- Every item is tagged:
  - **[UI]** what the farmer sees: screens, labels, charts, layout
  - **[Backend]** the code behind the screens in `src/lib/`: the maths, data fetching, caching. Kurima has no server; this all runs in the browser.
  - **[Test]** tests: unit tests with Vitest for the maths and data code, end-to-end tests with Playwright for what a farmer does in the browser (pick a town, read the signal, switch screens).

## Principles
- **No personal data.** No accounts, no device location, no phone numbers. Reminders stay on the device; summaries are shared by the farmer, not sent by Kurima.
- **No data stored outside the device, for now.** Kurima has no server or database. It only reads public data (Open-Meteo, open soil and price datasets) and caches it in the browser. Anything new that would store data elsewhere needs its own decision first.
- **Sample data is always enough to build.** Every feature (soil, prices, crop guides, country presets) can be built, tested and demonstrated with a small sample bundled in the app, so no feature waits on an API, an account or a partner. Samples are taken from a named open source, never invented, and labelled as sample data in the app. A live source can replace a sample later, but is never required.
- **Zimbabwe first.** Rules, guides and sample data are built and checked for Zimbabwe before other countries (see Milestone 5). Search still works anywhere in Africa, with a note where advice isn't checked yet.
- **Advice is reviewed.** Fertiliser, seed, crop and pest guidance is checked against AREX / ministry or agronomist advice before it ships.
- **Tested as it's built.** Every phase adds its own unit and end-to-end tests; testing is not saved for the end.
- **Works offline.** Every screen, not just the weather, works from the device's cache when there's no signal, and says how old its data is.
- **Every source credited.** Each data source (Open-Meteo, iSDAsoil, SoilGrids, WFP prices, and any added later) is credited in the app and README, with its licence.
- **The farmer's units.** Farmers choose their units (rain, temperature, area, weight, currency) and Kurima converts; the choice is kept on the device.
- **Docs in step.** Every phase's *Done when* includes the README and screenshots matching the app.
- **Worth opening.** A screen earns its place by changing what the farmer does that day. Anything that is merely true goes into a section they can open, not the first thing they see.
- **Measured by simulation, not tracking.** Kurima collects no usage data, so whether it helps is measured by replaying the past: what would Kurima have advised, and what happened next? Planting advice is replayed against past rain (Milestone 1 Phase 2); money advice ("will it pay?", "sell now or store?") against past prices (Milestones 2 and 4).

---

# Milestone 1: Weather and planting
*Goal:* a farmer can trust Kurima's answer to "should I plant now?" and understand this season's rain.

## ✅ Done (9/9)
- [x] **1.** Search any town in Africa, or pick a sample town
- [x] **2.** Plant-or-wait signal from recent rain, the 16-day forecast and dry spells ahead
- [x] **3.** Configurable local onset rule (rain amount, window, dry-spell length)
- [x] **4.** Rain chart: last 2 weeks modelled, next 16 days forecast, soil moisture
- [x] **5.** Three-month season outlook from 51 ECMWF ensemble runs against 1991–2020 history
- [x] **6.** Monthly rainfall normals for the location
- [x] **7.** Installable PWA with offline caching of recent weather
- [x] **8.** Unit tests for the signal and climate maths
- [x] **9.** Deployed to Vercel

## Phase 1: Trust the signal (12/12)
Focus: **rain-fed maize in selected Zimbabwean districts** first. The Africa-wide search stays, but the rules get tested somewhere specific before they're trusted everywhere.
- [x] **1.** **[UI]** **Remove device location.** Drop "Use my location"; farmers search or pick a town. Update the privacy note, README and screenshots.
- [x] **2.** **[Backend]** **Today counts as "already fallen".** `App.tsx` puts today's full-day total into recent rain, but it includes rain still forecast for later today. Use completed days only.
- [x] **3.** **[Backend + UI]** **No forecast reads as "no dry spell".** An empty or short forecast currently gives "Good time to plant". Add an "insufficient data" state, and require a minimum forecast length.
- [x] **4.** **[Backend]** **Partial seasons leak into the baseline.** `seasonTotalsByYear` keeps a Nov–Jan "1990 season" that only has January (history starts 1 Jan 1991), pulling the normal range down. Keep complete seasons only, and add a test for it.
- [x] **5.** **[Backend + UI]** **Stale cached weather looks current.** The service worker allows responses up to 7 days old. Show the data's age, and hide the recommendation when it's too old.
- [x] **6.** **[UI]** **Labels:** past-day rainfall is modelled (archived forecasts), not rain-gauge observations. Say "modelled" everywhere.
- [x] **7.** **[Backend + UI]** **Hide the outlook in the dry season.** When the historical normal for the window is ~0 mm (e.g. Kano, Nov–Jan), the terciles are meaningless but still show percentages. Show "dry season, no outlook" instead.
- [x] **8.** **[UI]** Copy fixes: "1 days" → "1 day"; chart legend "observed" → "modelled"
- [x] **9.** **[Test]** Vitest unit test for each fix that changes behaviour (today's rain, missing forecast, partial seasons, stale data, dry-season outlook)
- [x] **10.** **[Test]** Set up Playwright, with a first end-to-end test: pick a sample town and see a plant/wait answer, with the weather service faked so the test doesn't depend on live data
- [x] **11.** **[Test]** End-to-end tests for "not enough data" and "data too old"
- [x] **12.** **[Backend]** GitHub Actions CI: type-check, lint, unit tests, Playwright tests, build

*Done when:* every fix above has a test where it changes behaviour, Playwright covers the main flow, CI is green, the README and screenshots match the app, and the live demo is redeployed.

*Status (2 Nov 2026):* all twelve items are in. 43 unit tests and 7 Playwright tests pass; CI workflow added; README and screenshots updated. Redeploy happens when the branch is merged to `main`.

*Next:* the layering rework this called for became Phase 3, which was brought forward and is now done.

## Phase 2: Season smarts (0/12)
*Why:* false starts and late onsets are the main planting risk. In 2026 Zimbabwe's Met service put the chance of below-normal rain for Oct 2026–Mar 2027 at 65%, and farmers were warned not to plant on the first storms ([FEWS NET](https://fews.net/southern-africa/zimbabwe/key-message-update/september-2026/print)).
- [ ] **1.** **[Backend]** **Calibrate the season outlook.** Compare seasonal-model totals against the model's own historical runs (Open-Meteo's seasonal data is unadjusted), not against ERA5, before showing percentages.
- [ ] **2.** **[Backend]** **Season simulator**: replay every season since 1991 day by day in the pilot districts, recording what Kurima would have advised, using only the data available on that day
- [ ] **3.** **[Backend]** **Score the advice** against what happened next: false starts (planted, then a damaging dry spell), missed windows (said wait when it was safe), and whether the season had enough rain for maize to finish
- [ ] **4.** **[Backend]** **Compare with common practice without Kurima**: planting on the first big storm, or on a fixed date
- [ ] **5.** **[UI]** Results page in the docs (not the app): scores per district, so changes to the rule can be judged by whether the scores improve
- [ ] **6.** **[Test]** The simulator runs in CI on recorded data, so a change that makes the scores worse is caught
- [ ] **7.** **[Backend + UI]** **Bimodal seasons**: detect one or two rainy seasons per location (e.g. East Africa's long and short rains) from the normals, and judge onset per season
- [ ] **8.** **[Backend + UI]** **Typical onset window**: from 30 years of daily history, the usual start date of the rains here and how late this year is
- [ ] **9.** **[Backend + UI]** **This season vs past seasons**: rain so far compared with every year since 1991
- [ ] **10.** **[Backend + UI]** **Country presets** for onset rules published by national services, clearly sourced
- [ ] **11.** **[Test]** Unit tests for calibration, season detection and onset dates, using recorded data from a few Zimbabwe districts
- [ ] **12.** **[Test]** Playwright tests for each new view
*(The tap-on-map picker moved to Milestone 5, with the rest of choosing a place.)*

*Done when:* the outlook is calibrated, the onset rule has been checked against past seasons with the results written up, and each new view has unit and end-to-end tests.

## Phase 3: Restructure for more than one page (6/6)
Today Kurima is one page with everything stacked. Phase 4's new views, then soil, crops and markets, need room.
- [x] **1.** **[UI]** Navigation: separate screens or tabs (e.g. Today, Season, later Soil, Crops, Markets)
- [x] **2.** **[Backend]** Shared chosen place and settings, available to every screen
- [x] **3.** **[Backend]** A data-source layer: every source answers "give me X for this place" the same way, so sample data can be swapped for an API without touching the screens
- [x] **4.** **[UI]** A consistent "sample data" and "data age" label used everywhere
- [x] **5.** **[Backend + UI]** Units setting: the farmer picks their units (e.g. mm or inches of rain, °C or °F, kg per hectare or bags per acre, local currency) and every screen converts; the choice is kept on the device
- [x] **6.** **[Test]** Unit tests for the conversions; Playwright tests for moving between screens, keeping the chosen place, and switching units

*Done when:* the weather screens work exactly as before inside the new structure, units can be switched everywhere, and all unit and Playwright tests pass.

*Status (2 Nov 2026):* done, brought forward ahead of Phase 2 so the layering was fixed before more maths landed on it. Three screens (Today, Season, Settings) with the tab in the URL hash; chosen place, units and rule shared through a provider and kept on the device; `src/lib/` holds no React and `App.tsx` holds no domain logic; a `DataLabel` shows source, licence and age on every card; rain in mm or inches and temperature in °C or °F. Weight, area and currency wait for Milestone 2, when there is a yield or a price to convert. 66 unit tests and 14 Playwright tests.

*Also done here, bringing the app up to the Zimbabwe-first principle:* the first version's sample towns were six capitals across Africa, chosen to demonstrate the idea works anywhere. Now that the pilot is being built for real, they are eight Zimbabwean districts spanning the wetter north-east to the drier south-west (Bindura, Chinhoyi, Marondera, Harare, Mutare, Gweru, Masvingo, Gwanda), sourced from Open-Meteo geocoding. Search still reaches any town in Africa, and a place outside Zimbabwe now says its advice is not checked yet.

## Phase 4: Worth opening (0/9)
*Why:* the plant-or-wait answer is trustworthy now, but what sits under it is a set of measurements rather than reasons to act, so there is little cause to open Kurima on a day when nothing has obviously changed. Two gaps. First, Kurima reads rainfall on its own: on 3 November 2026 Harare had 0 mm of rain against an evaporative demand (ET0) of 6.7–7.5 mm a day, so "20 mm fell over three days" can still leave the soil drier than it started. Second, every card carries equal weight on one page, so nothing reads as the point. Open-Meteo already carries what closes the first gap, in both the forecast and the archive, at no extra cost in requests.
- [ ] **1.** **[Backend]** **Water balance:** rain against reference evapotranspiration (`et0_fao_evapotranspiration`), so onset is judged on the water the soil keeps, not the rain that fell. Thresholds reviewed against FAO and AREX guidance before they ship.
- [ ] **2.** **[Backend + UI]** **Soil temperature at planting depth** (`soil_temperature_6cm`): maize germinates poorly in cold soil and suffers in very hot soil. Harare read 35.8 °C at 6 cm on 3 November 2026.
- [ ] **3.** **[Backend + UI]** **How firm the forecast is** (`precipitation_probability_max`): "20 mm forecast" means a different thing at 15% than at 80%.
- [ ] **4.** **[Backend + UI]** **Root-zone moisture** (`soil_moisture_27_to_81cm`) beside the surface layer, for water a crop can still reach.
- [ ] **5.** **[UI]** **Dashboard layout:** the answer and the few numbers behind it first; charts, normals and method in sections a farmer opens only if they want them.
- [ ] **6.** **[UI]** **Visual design:** real hierarchy and status colour that carries meaning, so a screen reads as a verdict rather than a stack of cards.
- [ ] **7.** **[Backend + UI]** **When the window is likely to open:** days until conditions are expected to be met, so there is a reason to come back on a particular day.
- [ ] **8.** **[Backend]** **Precomputed climate packs for the pilot districts.** Monthly normals and season totals for one district come to 318 bytes; the 198 KB of daily history they are derived from is 624 times larger, takes about 1.2 s on a good connection and far longer on a village one. Bundle the packs, fall back to the live archive elsewhere. First real use of the data-source layer, and the bounded first step of the pipeline under Ideas.
- [ ] **9.** **[Test]** Unit tests for the water balance, the germination window and pack loading; Playwright tests for the dashboard and its collapsed sections.

*Done when:* the Today screen answers "what do I do, and why" without scrolling, the signal accounts for how fast the soil dries, the Season screen opens at once for a pilot district, and the agronomic thresholds have been reviewed.

## Phase 5: More weather (0/5)
- [ ] **1.** **[Backend + UI]** Heat-stress days for crops (temperature from Open-Meteo)
- [ ] **2.** **[UI]** Map of rain across a region, coloured wet to dry
- [ ] **3.** **[UI]** Compare two towns side by side
- [ ] **4.** **[Backend + UI]** "What if I'd planted on date X?": replay past seasons on a chart
- [ ] **5.** **[Test]** Unit tests for heat-stress and replay maths; Playwright tests for each view

*Done when:* each view works for the sample towns, with unit and end-to-end tests.

---

# Milestone 2: Soil and inputs
*Goal:* a farmer can see what their soil is like and whether fertiliser and seed will pay off.

*Why:* smallholders often lack access to good inputs and the credit to buy them, and fake maize seed is a known problem. Rwanda's fertiliser recommendation tool reaches over 1.5 million smallholders ([CGIAR](https://cgspace.cgiar.org/server/api/core/bitstreams/df225073-b2ab-4f7d-a712-ce8450c81449/content)).

## Phase 1: Know your soil (0/3)
- [ ] **1.** **[Backend]** Real sample soil values (pH, nitrogen, texture) for the sample towns, taken from [iSDAsoil](https://zenodo.org/record/4087972) (CC BY 4.0) or SoilGrids, with the source recorded
- [ ] **2.** **[UI]** Soil screen: what the values are and what they mean for maize, labelled as sample data
- [ ] **3.** **[Backend]** Live source once one proves reliable: SoilGrids REST, OpenEPI, or the iSDAsoil API if access is granted

## Phase 2: Fertiliser and seed (0/2)
- [ ] **1.** **[Backend + UI]** Fertiliser guide: how much and when, for the crop and soil, from published national recommendations (reviewed), shown in the farmer's chosen units (e.g. bags per acre)
- [ ] **2.** **[UI]** Buying good seed: certified varieties for the area and how to spot fake seed (reviewed)

## Phase 3: Will it pay? (0/3)
- [ ] **1.** **[Backend + UI]** Seed and fertiliser cost against likely yield × market price, worked out on the device
- [ ] **2.** **[Backend]** **Will-it-pay simulator**: replay past seasons' rain and prices (sample data) to check how often the estimate matched what a farmer would actually have earned
- [ ] **3.** **[Test]** Unit tests for the soil data layer and the cost calculation; Playwright tests for the soil and "will it pay?" screens

*Milestone done when:* soil, fertiliser and "will it pay?" work for the Zimbabwe sample towns, with sources shown, advice reviewed, and unit and end-to-end tests.

---

# Milestone 3: Crops and pests
*Why:* CGIAR reports delayed rains, shifting planting seasons and longer dry spells making traditional farming calendars less reliable in East Africa ([CGIAR](https://www.cgiar.org/news-events/news/breaking-barriers-making-climate-information-accessible-every-farmer)).

## Phase 1: Crop planner (0/6)
- [ ] **1.** **[UI]** Maize crop guide for the pilot districts, reviewed against AREX / ministry advice
- [ ] **2.** **[UI]** Crop guides (maize, sorghum, millet, groundnut, beans, cassava) with days to maturity and water needs
- [ ] **3.** **[Backend + UI]** "Will this crop finish before the rains end?" check using the outlook and normals
- [ ] **4.** **[UI]** Drought-tolerant alternatives in drier-than-normal seasons
- [ ] **5.** **[UI]** Conservation farming guides (e.g. Pfumvudza/Intwasa), reviewed by agronomists
- [ ] **6.** **[Backend]** Downloadable offline pack per district: normals, crop calendar, guides

## Phase 2: Pests (0/4)
*Why:* FAO built FAMEWS specifically for fall armyworm monitoring in Africa, which shows a clear need. Kurima's guide would complement it offline, not replace it ([FAO](https://www.fao.org/newsroom/detail/FAO-launches-mobile-application-to-support-fight-against-Fall-Armyworm-in-Africa/en)).
- [ ] **1.** **[UI]** Offline field guide for one crop first (maize: fall armyworm, stalk borer, maize streak)
- [ ] **2.** **[UI]** Symptom questions and photos leading to expert-reviewed next steps
- [ ] **3.** **[UI]** Links to official tools such as FAO FAMEWS
- [ ] **4.** **[Test]** Unit tests for the "will it finish?" check; Playwright tests for the crop and pest screens, including offline

---

# Milestone 4: After harvest

## Phase 1: Storage (0/3)
*Why:* a 2025 study identifies storage losses and barriers to better storage, including limited training, equipment availability and upfront costs ([FAO AGRIS](https://agris.fao.org/search/en/records/68cacc2af61e5b80b5e91ef2)). Post-harvest losses in sub-Saharan Africa are estimated at about $4 billion a year.
- [ ] **1.** **[UI]** Drying and storage checklists (moisture, hermetic bags, silos)
- [ ] **2.** **[Backend + UI]** Inspection reminders kept on the device
- [ ] **3.** **[Backend + UI]** Calculator comparing storage costs with likely losses and later prices

## Phase 2: Markets (0/5)
*Why:* the World Bank documents limited market information and difficulty reaching buyers among smallholders in Côte d'Ivoire and Benin ([World Bank](https://www.worldbank.org/en/results/2025/03/04/afw-from-fields-to-markets-the-role-of-digital-platforms-in-west-africa-agricultural-success)).
- [ ] **1.** **[Backend + UI]** Crop prices by market from the WFP food price dataset (HDX), with the date of each price, in the farmer's chosen units and currency
- [ ] **2.** **[Backend + UI]** Estimated proceeds after transport distance and market fees
- [ ] **3.** **[Backend + UI]** Seasonal price pattern: when prices usually recover after harvest ("sell now or store?")
- [ ] **4.** **[Backend]** **Price simulator**: replay past years of market prices (sample data from WFP) to check whether "sell now" or "store" advice would have earned more, after storage costs and losses
- [ ] **5.** **[Test]** Unit tests for the storage and proceeds calculations; Playwright tests for the storage and market screens

---

# Milestone 5: Any place in Africa
*Goal:* choosing where you farm, and knowing how far Kurima's advice can be trusted there, is one coherent idea rather than a pilot list with a search box beside it.

*Why:* the picker currently offers eight Zimbabwean districts and hides "somewhere else in Africa" behind a disclosure, which reads as two products sharing a screen. The honest version is a single question — where do you farm? — answered at whatever confidence Kurima actually has for that place. That has to exist before more countries arrive (Milestone 6), because each one lands at a different level of confidence.

## Phase 1: One way to choose a place (0/5)
- [ ] **1.** **[Backend]** **Coverage levels** as a first-class idea: *checked* (rules validated against past seasons there), *weather only* (the forecast is right, the rule is not reviewed). One function answers which applies to a place.
- [ ] **2.** **[UI]** **One picker.** Search and the pilot districts become the same control, not a list with a hidden fallback; a search result carries its coverage level.
- [ ] **3.** **[UI]** Coverage shown where it changes what the farmer should do, in plain words, without burying the advice in warnings.
- [ ] **4.** **[Backend + UI]** **Recent places**, kept on the device, so a farmer with two fields switches in one tap.
- [ ] **5.** **[UI]** Tap-on-map picker *(moved here from Milestone 1 Phase 2, where it sat oddly among the season maths)*.

## Phase 2: Zimbabwe properly (0/4)
- [ ] **1.** **[Backend]** All of Zimbabwe's districts rather than eight sample towns, from a named open administrative dataset with the source recorded.
- [ ] **2.** **[Backend]** The district list bundled with the app, so choosing a place works with no signal.
- [ ] **3.** **[UI]** Choose by province, then district, for farmers who do not think in nearest-large-town.
- [ ] **4.** **[Test]** Unit tests for coverage levels and the district data; Playwright tests for picking, searching and switching places offline.

*Done when:* a farmer anywhere in Africa picks their place one way, and Kurima says plainly how much it knows about there.

---

# Milestone 6: More countries (1/6)
*Goal:* Kurima's advice is checked and adapted country by country, starting with Zimbabwe, instead of one rule for all of Africa.

Each country needs: onset-rule presets from its national met service, crop and pest guides checked by local experts, local market prices, sample soil data, and its main languages (Milestone 7). Milestone 5 builds the coverage machinery this leans on.
- [ ] **1.** **Phase 1: Zimbabwe, all districts.** Extend from the pilot districts to the whole country; Shona and Ndebele (with Milestone 7)
- [ ] **2.** **Phase 2: Southern Africa neighbours** (e.g. Malawi, Zambia, Mozambique): similar one-season rains, closest to Zimbabwe's rules
- [ ] **3.** **Phase 3: East Africa** (e.g. Kenya, Tanzania, Uganda): two rainy seasons, needs bimodal support from Milestone 1 Phase 2
- [ ] **4.** **Phase 4: West Africa** (e.g. Nigeria, Ghana, Mali): different crops and seasons; French and Hausa
- [x] **5.** **[UI]** Show which countries have checked advice, and a clear note where a place isn't covered yet *(done 2 Nov 2026 with Milestone 1 Phase 3)*
- [ ] **6.** **[Test]** Unit tests per country preset; Playwright tests for a sample town in each country

*Done when (per country):* presets, guides and sample data are sourced and reviewed for that country, with tests.

---

# Milestone 7: Reach

## Phase 1: Languages and low data (0/5)
- [ ] **1.** **[UI]** Languages: Shona, Ndebele, Swahili, Hausa, French and Portuguese, translated and checked by native speakers
- [ ] **2.** **[UI]** Very low-data mode and text-only view
- [ ] **3.** **[UI]** Short text summaries the farmer can copy and share themselves (no phone numbers collected)
- [ ] **4.** **[Backend + UI]** Shareable forecast image for messaging apps
- [ ] **5.** **[UI]** Printable season summary for extension officers

## Phase 2: Mobile app and accessibility (0/4)
- [ ] **1.** **[UI + Backend]** Mobile app with Expo (Android first), sharing the `lib/` logic with the web app
- [ ] **2.** **[UI]** Accessibility pass and large-text mode
- [ ] **3.** **[Backend]** Error reporting without collecting personal data
- [ ] **4.** **[Test]** Playwright tests for each language, low-data mode and large text; automated accessibility checks

---

## Ideas (not yet planned)
_Add new ideas here before they're placed in a milestone._
- **Precomputed data pipeline (performance and low data).** Today the browser downloads 30 years of daily rain (about 200 KB per town, measured for Harare) to work out a dozen monthly normals and thirty season totals (under 1 KB). A build-time pipeline (Node scripts run in CI) could emit small per-district packs: normals, typical onset dates, calibrated outlook tables, later soil samples and price history. Same artifact serves Milestone 3's offline pack. Optionally a single stateless edge function that fetches the 16-day forecast and caches it by coordinates rounded to ~0.1°, which also coarsens the location sent upstream. No database, no accounts. Decided 2 Nov 2026, revisited 3 Nov: the bounded first step (climate packs for the pilot districts) is now Milestone 1 Phase 4 item 8, since it fixes a slow Season screen today. The wider pipeline — calibration tables, simulator output, soil and price data — stays here until Phase 2 needs it.

---

Guidance in Kurima is advisory. Farmers should always follow their national meteorological service and agricultural extension officers.
