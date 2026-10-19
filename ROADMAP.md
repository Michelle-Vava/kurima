# Kurima Roadmap

Kurima helps farmers across Africa make better decisions through the season: when to plant, what to expect from the rains, where to sell, and how to keep what they harvest. Everything runs on free, open data with no accounts and no personal data.

## Done
- [x] Search any town in Africa, or use the device location once
- [x] Plant-or-wait signal from recent rain, the 16-day forecast and dry spells ahead
- [x] Configurable local onset rule (rain amount, window, dry-spell length)
- [x] Rain chart: last 2 weeks observed, next 16 days forecast, soil moisture
- [x] Three-month season outlook from 51 ECMWF ensemble runs against 1991–2020 history
- [x] Monthly rainfall normals for the location
- [x] Installable PWA with offline caching of recent weather
- [x] Unit tests for the signal and climate maths

## Milestone 1: Make the core signal trustworthy
Focus: **rain-fed maize in selected Zimbabwean districts** first. The Africa-wide search stays, but the rules get tested somewhere specific before they're trusted everywhere.

Known issues found in review:
- [ ] **Today counts as "already fallen".** `App.tsx` puts today's full-day total into recent rain, but it includes rain still forecast for later today. Use completed days only.
- [ ] **No forecast reads as "no dry spell".** An empty or short forecast currently gives "Good time to plant". Add an "insufficient data" state, and require a minimum forecast length.
- [ ] **Partial seasons leak into the baseline.** `seasonTotalsByYear` keeps a Nov–Jan "1990 season" that only has January (history starts 1 Jan 1991), pulling the normal range down. Keep complete seasons only, and add a test for it.
- [ ] **Stale cached weather looks current.** The service worker allows responses up to 7 days old. Show the data's age, and hide the recommendation when it's too old.
- [ ] **Labels:** past-day rainfall is modelled (archived forecasts), not rain-gauge observations. Say "modelled" everywhere.
- [ ] **Calibrate the season outlook.** Compare seasonal-model totals against the model's own historical runs (Open-Meteo's seasonal data is unadjusted), not against ERA5, before showing percentages.
- [ ] **Validate the onset rule** against past seasons in the pilot districts: how often would "plant" have been followed by a damaging dry spell?
- [ ] Maize crop guide for the pilot districts, reviewed against AREX / ministry advice

## Phase 1: Better season intelligence
*Why:* false starts and late onsets are the main planting risk. In 2026 Zimbabwe's Met service put the chance of below-normal rain for Oct 2026–Mar 2027 at 65%, and farmers were warned not to plant on the first storms ([FEWS NET](https://fews.net/southern-africa/zimbabwe/key-message-update/september-2026/print)).
- [ ] **Bimodal seasons**: detect one or two rainy seasons per location (e.g. East Africa's long and short rains) from the normals, and judge onset per season
- [ ] **Typical onset window**: from 30 years of daily history, the usual start date of the rains here and how late this year is
- [ ] **This season vs past seasons**: rain so far compared with every year since 1991
- [ ] **Bias-corrected outlook**: calibrate the seasonal model against its own hindcasts
- [ ] **Country presets** for onset rules published by national services, clearly sourced
- [ ] Tap-on-map location picker

## Phase 2: Crop planner: "how should I adjust my plans to changing rainfall?"
*Why:* CGIAR reports delayed rains, shifting planting seasons and longer dry spells making traditional farming calendars less reliable in East Africa ([CGIAR](https://www.cgiar.org/news-events/news/breaking-barriers-making-climate-information-accessible-every-farmer)).
- [ ] Crop guides (maize, sorghum, millet, groundnut, beans, cassava) with days to maturity and water needs
- [ ] "Will this crop finish before the rains end?" check using the outlook and normals
- [ ] Drought-tolerant alternatives in drier-than-normal seasons
- [ ] Conservation farming guides (e.g. Pfumvudza/Intwasa), reviewed by agronomists
- [ ] Downloadable offline pack per district: normals, crop calendar, guides

## Phase 3: Markets: "where can I sell for a better return?"
*Why:* the World Bank documents limited market information and difficulty reaching buyers among smallholders in Côte d'Ivoire and Benin ([World Bank](https://www.worldbank.org/en/results/2025/03/04/afw-from-fields-to-markets-the-role-of-digital-platforms-in-west-africa-agricultural-success)).
- [ ] Crop prices by market from the WFP food price dataset (HDX), with the date of each price
- [ ] Estimated proceeds after transport distance and market fees
- [ ] Seasonal price pattern: when prices usually recover after harvest ("sell now or store?")

## Phase 4: Storage: "how do I stop losing grain?"
*Why:* a 2025 study identifies storage losses and barriers to better storage, including limited training, equipment availability and upfront costs ([FAO AGRIS](https://agris.fao.org/search/en/records/68cacc2af61e5b80b5e91ef2)). Post-harvest losses in sub-Saharan Africa are estimated at about $4 billion a year.
- [ ] Drying and storage checklists (moisture, hermetic bags, silos)
- [ ] Inspection reminders kept on the device
- [ ] Calculator comparing storage costs with likely losses and later prices

## Phase 5: Pests: "what is damaging my crop?"
*Why:* FAO built FAMEWS specifically for fall armyworm monitoring in Africa, which shows a clear need. Kurima's guide would complement it offline, not replace it ([FAO](https://www.fao.org/newsroom/detail/FAO-launches-mobile-application-to-support-fight-against-Fall-Armyworm-in-Africa/en)).
- [ ] Offline field guide for one crop first (maize: fall armyworm, stalk borer, maize streak)
- [ ] Symptom questions and photos leading to expert-reviewed next steps
- [ ] Links to official tools such as FAO FAMEWS

## Phase 6: Reach
- [ ] Languages: Shona, Ndebele, Swahili, Hausa, French and Portuguese, translated and checked by native speakers
- [ ] Very low-data mode and text-only view
- [ ] SMS / USSD-friendly summaries
- [ ] Mobile app with Expo (Android first), sharing the `lib/` logic with the web app
- [ ] Accessibility pass and large-text mode

## Phase 7: Quality
- [ ] Component and end-to-end tests
- [ ] GitHub Actions CI: type-check, test, build
- [ ] Deploy to Vercel
- [ ] Error reporting without collecting personal data

---

Guidance in Kurima is advisory. Farmers should always follow their national meteorological service and agricultural extension officers.
