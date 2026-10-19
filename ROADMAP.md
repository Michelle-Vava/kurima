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

## Phase 1: Better season intelligence
- [ ] **Bimodal seasons**: detect one or two rainy seasons per location (e.g. East Africa's long and short rains) from the normals, and judge onset per season
- [ ] **Typical onset window**: from 30 years of daily history, the usual start date of the rains here and how late this year is
- [ ] **This season vs past seasons**: rain so far compared with every year since 1991
- [ ] **Bias-corrected outlook**: calibrate the seasonal model against its own hindcasts
- [ ] **Country presets** for onset rules published by national services, clearly sourced
- [ ] Tap-on-map location picker

## Phase 2: Crop planner
- [ ] Crop guides (maize, sorghum, millet, groundnut, beans, cassava) with days to maturity and water needs
- [ ] "Will this crop finish before the rains end?" check using the outlook and normals
- [ ] Drought-tolerant alternatives in drier-than-normal seasons
- [ ] Conservation farming guides (e.g. Pfumvudza/Intwasa), reviewed by agronomists
- [ ] Downloadable offline pack per district: normals, crop calendar, guides

## Phase 3: Markets: "where can I sell for a better return?"
- [ ] Crop prices by market from the WFP food price dataset (HDX), with the date of each price
- [ ] Estimated proceeds after transport distance and market fees
- [ ] Seasonal price pattern: when prices usually recover after harvest ("sell now or store?")

## Phase 4: Storage: "how do I stop losing grain?"
- [ ] Drying and storage checklists (moisture, hermetic bags, silos)
- [ ] Inspection reminders kept on the device
- [ ] Calculator comparing storage costs with likely losses and later prices

## Phase 5: Pests: "what is damaging my crop?"
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
