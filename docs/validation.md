# How we know when Kurima is wrong

Kurima tells farmers when to plant. If it is wrong, someone loses a season. This is the
honest account of what is checked, what is not, and how much weight the answer can bear.

## The distinction that matters

**Unit tests prove the code does what we said. They say nothing about whether what we said is
right.** `evaluateSignal` can be perfectly implemented and still give bad advice, because the
rule inside it is a human judgement about agronomy. Those are two different kinds of wrong and
they need two different kinds of checking.

## What is checked today

### 1. Unit tests — is the code what we meant?
87 tests across `src/lib/`. Example-based: given this rain, expect this answer.
**Catches:** typos, off-by-one errors, wrong comparisons, regressions.
**Misses:** a rule that is implemented perfectly and is simply wrong.

### 2. Property tests — is what we meant self-consistent?
`src/lib/signal-properties.test.ts` asserts relationships that must hold for *any* input:
more rain never makes the advice more negative; more evaporation never improves confidence;
evaporation never changes the verdict itself, only the confidence attached to it.
**Catches:** sign errors and inverted logic that example tests walk past, because they hold
over a whole space of inputs rather than a handful of chosen points.
**Misses:** anything where the rule is consistently, coherently wrong.

### 3. Backtest — was the advice any good?
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

## What this has already caught

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

## What is not checked, and so cannot be claimed

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

## The ladder, strongest last

1. Unit tests — the code is what we meant. ✅
2. Property tests — what we meant is self-consistent. ✅
3. Backtest on recorded events — the advice beat doing nothing. ◐ partial
4. Full season simulator with a hold-out set — Milestone 1 Phase 2. ✗
5. Compared against what a farmer does anyway, planting on the first big storm. ✗
6. Reviewed by an agronomist against AREX guidance. ✗
7. Field validation with real farmers over real seasons. ✗

**Until 4 and 6 are done, Kurima should not claim its advice beats a farmer's own judgement,
and the README should keep saying so.**
