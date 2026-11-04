# Kurima build order

[ROADMAP.md](ROADMAP.md) is the ambition: everything Kurima should eventually do, grouped by
subject. It stays as it is. This file is the decision about **what to build next and why**, and
the two will not match — the roadmap groups work by topic, and topics are not the order you
build them in.

Last reviewed **3 November 2026**.

---

## How things are ranked

Four questions, in this order:

1. **Is Kurima wrong without it?** A wrong planting answer costs a farmer a season. Nothing
   outranks this.
2. **Does doing it later mean doing it twice?** Anything that changes *what the signal reads*
   has to land before anything that measures or displays the signal.
3. **Does the farmer notice?** Invisible work is still real work, but a run of it means months
   where nothing improves for the person using the app.
4. **How big is it?** Last, deliberately. Cheapness is a tiebreaker, not a reason.

One standing constraint: **deepen before broadening.** Work that squeezes more out of the data
Kurima already fetches beats work that adds a new source, a new screen or a new subject.

---

## What we learned on 3 November 2026

Measured for Harare, not estimated. This is what reordered the plan.

| Finding | Number | So what |
|---|---|---|
| Rain over the last 14 days | 7.5 mm | |
| Evaporation (ET0) over the same 14 days | 92.7 mm | **The ground lost 85 mm net.** Kurima never looks at this. |
| Next 16 days | 46 mm rain vs 101 mm ET0 | Still −55 mm. The coming rain does not turn it around. |
| Biggest 3-day fall ahead | 18.6 mm | The onset threshold is 20 mm. **One slightly wetter storm triggers "plant"** into a fortnight that keeps losing water. |
| Soil at 6 cm | 35.8 °C | Hot enough to hurt germination. Not read either. |
| Typical onset here, 29 seasons | **27 November** (middle half 20 Nov – 9 Dec) | Today is 24 days early. Kurima says "too dry" with no hint that this is *completely normal for the date*. |
| Derived climate pack vs raw history | 318 bytes vs 198,341 | 624× more data downloaded than used. |

Two conclusions. The signal reads rainfall in isolation and can be wrong because of it. And the
app withholds the one piece of context that makes its answer meaningful — whether "too dry" is
alarming or routine.

---

## Stage 1 — Make the answer right ✅ *(3 November 2026)*

*Roadmap: Milestone 1 Phase 4 items 1–4.*

- [x] **Water balance.** Rain against reference evapotranspiration, as a ratio.
- [x] **Soil temperature** at seeding depth as a germination check.
- [x] **Forecast confidence** from rainfall probability.
- [x] **Stop showing uncalibrated outlook percentages.** The outlook shows a lean only.
- [x] **A way to tell whether any of it helps** — see [docs/validation.md](docs/validation.md).
- [ ] Thresholds reviewed against FAO and AREX guidance. **Still open**; every constant in
      `src/lib/agronomy.ts` is marked provisional.

**What the evidence changed.** The plan was to make water balance a veto on the planting
answer. Backtesting against 116 real onset events said no:

- A −40 mm threshold looked excellent at Harare, where it was chosen, and missed two of three
  bad starts at Gwanda. Tuning and testing on one district had hidden that.
- The FAO-style rain-to-ET0 ratio generalises better but still only catches 7 of 10 false
  starts, at 7 false alarms in 66 plant calls.
- So it **colours the answer rather than overruling it**. Shipping it as a veto would have made
  Kurima more confident and less right.
- "Soil too hot to sow" came from a 35.8 °C midday surface spike. The daily mean at seeding
  depth across all 116 events was 13.5–28.9 °C, so the heat gate will never fire in Zimbabwe.
  It stays for East African altitude, and the claim was dropped from the interface.

Net effect: of 38 starts followed by a crop-killing dry spell, 28 are blocked outright and 7
more are warned about. 10 bad starts still get a plain "plant". Closing that gap is Stage 4.

**Also shipped, unplanned:** a **Learn** screen explaining onset, false starts,
evapotranspiration, dry spells, soil temperature, normals, outlook confidence and what
"modelled" means — written for someone new to farming.

**Why first.** It is the only work on this list where Kurima is currently capable of being
wrong, and the failure mode is the expensive one: a false start kills the seed. Everything
downstream also depends on it. The Stage 4 simulator scores *a rule* — build it before the rule
is settled and it gets written twice. The Stage 2 dashboard displays *numbers* — design it
before the numbers exist and it gets laid out twice.

**Cost.** Low. Same endpoints, no new sources, pure functions in `src/lib/` with unit tests.

---

## Stage 2 — Make it worth opening

*Roadmap: Milestone 1 Phase 4 items 5–7, plus Phase 2 items 8–9 pulled forward.*

- [ ] **Typical onset date** from 30 years of history, and how far off it today is.
- [ ] **Days until the window is likely to open**, so there is a reason to come back on a day.
- [ ] **Dashboard layout**: the answer and the few numbers behind it first, everything else in
      sections the farmer opens.
- [ ] **Visual hierarchy**: the screen reads as a verdict, not a stack of equal cards.
- [ ] **This season against past seasons** (collapsed).

**Why second.** This is the "why would I open this" problem, and it is mostly *reorganising what
we already have* rather than new features. The typical onset date is the clearest example: it
needs no new data, just the daily history already downloaded, and it changes "Too dry to plant"
into "Too dry, and that is normal — the rains here break around 27 November, 24 days away."

**Note on sequencing.** Items 8 and 9 sit under Phase 2 in the roadmap, filed with the season
maths. They do not need the simulator and should not wait for it.

---

## Stage 3 — Fast, and clear about place

*Roadmap: Milestone 1 Phase 4 item 8, Milestone 5 Phase 1.*

- [ ] **Precomputed climate packs** for the pilot districts. Season opens instantly and offline.
- [ ] **Coverage levels** as a real concept: *checked* vs *weather only*.
- [ ] **One picker** — search and districts as the same control, not a list with a hidden fallback.
- [ ] **Recent places**, for a farmer with two fields.

**Why third.** None of it changes the answer, so it ranks below Stages 1 and 2. But the packs
unblock Stage 4 (the simulator wants precomputed history anyway), and the picker is a real
complaint about the app feeling like two products sharing a screen.

---

## Stage 4 — Prove it works

*Roadmap: Milestone 1 Phase 2 items 1–6.*

- [ ] Calibrate the season outlook against the model's own hindcasts.
- [ ] Season simulator: replay every season since 1991, using only data available that day.
- [ ] Score it: false starts, missed windows, seasons too short to finish.
- [ ] Compare against planting on the first big storm, or on a fixed date.
- [ ] Write the results up; run the simulator in CI so a change that worsens the score is caught.

**Why last, and why it still matters.** This is the most important thing on the page and the
least visible. Today "20 mm over 3 days" is an assumption nobody has tested. Until this exists,
Kurima cannot honestly claim its advice beats a farmer's own judgement, and the README should
keep saying so.

It goes last because it measures the rule, so the rule must be settled first (Stage 1), and
because a farmer sees nothing change while it is built. Doing it now would mean months of
invisible work on an app that already feels thin.

---

## Deliberately not now

| Work | Why it waits |
|---|---|
| **Bimodal seasons** (Phase 2 item 7) | Only matters where there are two rainy seasons. Zimbabwe has one. This is a prerequisite for East Africa, so it belongs with that country work, not here. |
| **Country onset presets** (Phase 2 item 10) | A preset list of one is a list. Meaningful once there is a second country. |
| **Rain map, compare two towns, what-if replay** (Phase 5) | New screens rather than better answers. The map also needs tiles, a new dependency. |
| **Heat stress** (Phase 5 item 1) | Cheap and uses data we already fetch, but it matters at flowering, not at planting. Natural follow-on once Stage 1 lands. |
| **Soil, fertiliser, seed** (Milestone 2) | New data source. Breaks "deepen before broadening". |
| **Crop guides, pests** (Milestone 3) | New content needing expert review — a different kind of work from a different kind of person. |
| **Storage, markets** (Milestone 4) | Different point in the season. Kurima has not earned the planting decision yet. |
| **More countries** (Milestone 6) | Needs Stage 4 first. Expanding an unvalidated rule multiplies the risk rather than the value. |
| **Languages, mobile app** (Milestone 7) | Translate the app once it is worth translating. |

---

## Open questions

- **Agronomic thresholds.** Still the biggest open question. The ratio of 0.5 was chosen by
  backtest, not by an agronomist, and it was chosen on the same four districts it was tested
  on. It needs review against AREX guidance, and a hold-out set.
- **Visual direction.** Three mockups in `docs/mockups/` — verdict-led, dashboard grid, and
  season-timeline-led. Stage 2 builds whichever is chosen.
- **Redeploy.** Phase 1 and 3 are merged but not live.
