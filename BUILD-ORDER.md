# Kurima build order

Three documents, three jobs:

| File | Job |
|---|---|
| [README.md](README.md) | What Kurima is and how to run it. |
| **BUILD-ORDER.md** (this file) | What is being built next, why in that order, and how we judge whether it works. |
| [ROADMAP.md](ROADMAP.md) | The whole ambition, grouped by subject. It is guidance, not sequence. |

Plus one reference: [docs/how-it-works.md](docs/how-it-works.md) explains the farming ideas from
scratch, with charts from real data.

Last reviewed **4 November 2026**.

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

Two standing constraints. **Deepen before broadening:** work that squeezes more out of the data
Kurima already fetches beats a new source, screen or subject. **No unasked-for surfaces:** a new
screen or section is agreed first, not shipped on initiative.

---

## What we learned, and what it changed

Measured for Harare, 3 November 2026.

| Finding | Number | So what |
|---|---|---|
| Rain over 14 days vs water the sun took back | 7.5 mm in, 92.7 mm out | The ground lost 85 mm net. Kurima looked only at the 7.5 mm. |
| Biggest 3-day fall in the forecast | 18.6 mm, threshold 20 | One wetter storm and the rule says "plant" into a fortnight still drying. |
| Usual onset here, 29 seasons | 27 November | 3 November is 24 days early; "too dry" is routine, not alarming. The app did not say so. |
| Derived climate pack vs raw history | 11 KB vs 198 KB | The Season screen downloaded 17× more than it used. |

---

## Stage 1 — Make the answer right ✅ 3 Nov

- [x] Water balance: rain against what the sun takes, as a ratio.
- [x] Soil temperature at seeding depth as a germination check.
- [x] Forecast confidence from rainfall probability.
- [x] The outlook shows a lean only; the uncalibrated percentages are gone.
- [x] A way to tell whether any of it helps (see *How we judge it*, below).
- [ ] Thresholds reviewed against FAO and AREX guidance. **Open.** Every constant in
      `src/lib/agronomy.ts` is marked provisional.

**What the evidence changed.** Water balance was going to veto a plant call. Replayed over 116
real onset events it catches 7 of 10 false starts at 7 false alarms in 66 plant calls — a useful
warning, too noisy to overrule the farmer — so it colours the answer instead. A fixed −40 mm
threshold looked excellent at Harare, where it was chosen, and missed two of three bad starts at
Gwanda; the ratio travels better. "Soil too hot to sow" came from a midday surface spike; the
daily mean at seeding depth across all 116 events was 13.5–28.9 °C, so the claim was dropped.

A Learn screen was built here without being asked for and was removed on 4 November: adding
explanation to the interface while the numbers under it are still being settled puts the cart
before the horse. The content survives as `docs/how-it-works.md`, where it was wanted.

## Stage 2 — Make it worth opening ◐ 4 Nov

- [x] **Typical onset date** from thirty years of history, and how many days away it is.
      Harare: "the rains here usually break around 27 Nov, 23 days away; most years 21 Nov–10 Dec".
- [x] **This season against past ones:** rain since the start of the farming year, ranked
      against the same date in every past season. Fills the archive's few-day lag from the
      forecast's completed days; stays silent unless 80% of the days are accounted for.
- [ ] Dashboard layout and visual hierarchy. **Deferred by decision**, 4 Nov: the numbers come
      first, the screen that leads with them after.

The farming year starts in the driest month of the normals (August for all eight pilot
districts, January for Kano), so nothing is hard-coded per country.

## Stage 3 — Fast, and clear about place ◐ 4 Nov

- [x] **Climate packs** for the eight pilot districts, built by `npx tsx scripts/build-packs.ts`
      through the same function the live path uses, so a pack can never disagree with it.
      About 11 KB each, loaded one at a time, offline. Anywhere else the browser still derives
      the same object from the live archive.
- [x] **Coverage levels** as a real type: `checked` or `weather-only`.
- [x] **Recent places**, four most recent, kept on the device.
- [ ] One picker for districts and search together. **Deferred**: it is an interface change.

## Stage 4 — Prove it works

- [ ] Calibrate the season outlook against the model's own hindcasts.
- [ ] Season simulator: replay every day of every season since 1991 with only the data
      available that day, for all pilot districts, with a hold-out set.
- [ ] Score false starts, missed windows and seasons too short to finish; compare against
      planting on the first big storm or on a fixed date.
- [ ] Write it up; run it in CI so a change that worsens the score fails the build.

**Why last, and why it matters most.** Everything above is the material this stage judges. It
goes last because it measures the rule, so the rule had to settle first, and because a farmer
sees nothing change while it is built. The backtest below is its small ancestor.

---

## Deliberately not now

| Work | Why it waits |
|---|---|
| Dashboard redesign; one picker | Interface changes, agreed to wait until the numbers are settled. Three mockups in `docs/mockups/` (verdict-led, dashboard grid, season-timeline-led) when the time comes. |
| Bimodal seasons | Only where there are two rainy seasons. Zimbabwe has one. Belongs with East Africa. |
| Country onset presets | A preset list of one is a list. |
| Rain map, compare towns, what-if replay, heat stress | New screens or later in the season. Heat stress is a cheap follow-on once planting is right. |
| Soil, fertiliser, crops, pests, markets, storage | New sources and new subjects. Kurima has not earned the planting decision yet. |
| More countries | Needs Stage 4 first. Expanding an unvalidated rule multiplies risk, not value. |
| Languages, mobile app | Translate the app once it is worth translating. |

---

## How we judge it

Kurima tells farmers when to plant. If it is wrong, someone loses a season. This is the honest
account of what is checked, what is not, and how much weight the answer can bear.

### The distinction that matters

**Unit tests prove the code does what we said. They say nothing about whether what we said is
right.** `evaluateSignal` can be perfectly implemented and still give bad advice, because the
rule inside it is a human judgement about agronomy. Those are two different kinds of wrong and
they need two different kinds of checking.

### What is checked today

#### 1. Unit tests — is the code what we meant?
87 tests across `src/lib/`. Example-based: given this rain, expect this answer.
**Catches:** typos, off-by-one errors, wrong comparisons, regressions.
**Misses:** a rule that is implemented perfectly and is simply wrong.

#### 2. Property tests — is what we meant self-consistent?
`src/lib/signal-properties.test.ts` asserts relationships that must hold for *any* input:
more rain never makes the advice more negative; more evaporation never improves confidence;
evaporation never changes the verdict itself, only the confidence attached to it.
**Catches:** sign errors and inverted logic that example tests walk past, because they hold
over a whole space of inputs rather than a handful of chosen points.
**Misses:** anything where the rule is consistently, coherently wrong.

#### 3. Backtest — was the advice any good?
`src/lib/backtest.test.ts`. 116 real onset events — every first 20 mm / 3 days trigger at
Harare, Bindura, Gwanda and Mutare, 1991 to 2019 — replayed through the real code and scored
against what the weather actually did next. Run `npm run explain`:

```
  Onset triggers replayed         116
  Followed by a killing dry spell  38   (33% of all triggers)

  Rainfall rule says PLANT         66
    went badly anyway              10   (15% of plant calls)
    turned out fine                56
  Bad starts the rule blocked      28 of 38

  Water balance on those 66 plant calls: 14 marked marginal
    correctly warned                7 of 10 false starts
    missed                          3
    false alarms                    7

  Together: 35 of 38 bad starts are blocked or warned about.
```

Those numbers are asserted, so a change that makes the advice worse fails the build.

**"Bad start" is a proxy**, not a measurement: a dry spell of 10 days or more within 30 days of
planting, long enough to kill young maize. Nobody measured a dead crop. Only a field trial
would do that.

### What this has already caught

The backtest was written to support adding water balance to the rule, and it argued against
doing it the way we planned:

- A fixed threshold of −40 mm looked excellent at Harare, where it was chosen — and missed two
  of three bad starts at Gwanda. **Tuning and testing on the same district had hidden that.**
- Switching to the FAO-style ratio of rain to ET0 generalised better, but still only catches 7
  of 10 false starts at the cost of 7 false alarms out of 66 plant calls.
- So water balance **colours the answer rather than overruling it**. It was not good enough to
  be a veto, and shipping it as one would have made Kurima more confident and less right.
- Separately: the "soil too hot to sow" idea came from a 35.8 °C reading that turned out to be
  a midday surface spike. The daily mean at seeding depth across all 116 events ran 13.5–28.9 °C.
  The gate stays in for other climates, but it will essentially never fire in Zimbabwe, and
  claiming otherwise in the interface would have been misleading.

### What is not checked, and so cannot be claimed

- **Only the first trigger of each season.** The real simulator (Milestone 1 Phase 2) replays
  every day of every season. Until then this scores one decision per season, not the advice.
- **Only four districts, only Zimbabwe, only maize, only 29 seasons.** Small samples. A
  threshold that looks good on 116 events can easily be fitted to noise.
- **No hold-out set.** The ratio threshold was chosen by looking at all four districts. It
  should be chosen on some and tested on the rest.
- **No agronomist has reviewed any threshold.** Every constant in `src/lib/agronomy.ts` is
  provisional and says so.
- **The seasonal outlook is uncalibrated.** It is not compared against the model's own past
  forecasts, so the tercile split is not a probability. This is why the interface now shows
  only which way it leans.
- **No field validation at all.** Nobody has planted on Kurima's advice and reported back.

### The ladder, strongest last

1. Unit tests — the code is what we meant. ✅
2. Property tests — what we meant is self-consistent. ✅
3. Backtest on recorded events — the advice beat doing nothing. ◐ partial
4. Full season simulator with a hold-out set — Milestone 1 Phase 2. ✗
5. Compared against what a farmer does anyway, planting on the first big storm. ✗
6. Reviewed by an agronomist against AREX guidance. ✗
7. Field validation with real farmers over real seasons. ✗

**Until 4 and 6 are done, Kurima should not claim its advice beats a farmer's own judgement,
and the README should keep saying so.**
---

## Open questions

- **Agronomic thresholds.** The ratio of 0.5 was chosen by backtest, not by an agronomist, and
  on the same four districts it was tested on. It needs review against AREX guidance, and a
  hold-out set.
- **Visual direction.** Parked until the numbers are settled; see the mockups.
- **Redeploy.** Nothing since Phase 1 is live.
