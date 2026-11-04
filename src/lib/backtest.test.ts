// Backtest: how good is the advice, measured against what actually happened?
//
// Unit tests prove the code does what we said. This asks whether what we said
// is any good. It replays 116 real onset events — every first 20 mm/3 days
// trigger at four Zimbabwe districts, 1991 to 2019 — through the real
// evaluateSignal, and scores the answer against the next 30 days of weather.
//
// "Bad start" here means a dry spell of 10 days or more arrived within 30 days
// of the trigger: long enough to kill a young maize crop. It is a proxy for
// crop failure, not a measurement of it; only a field trial would be that.
//
// Run `npm run explain` to print the scorecard.
//
// This is the small, honest ancestor of the season simulator in Milestone 1
// Phase 2. That one replays every day of every season; this one looks only at
// the first trigger. Do not read it as validation of Kurima as a whole.

import { describe, expect, it } from 'vitest'
import events from './fixtures/onset-events.json'
import { evaluateSignal } from './onset'
import { isMarginal, waterBalance } from './water'

const EXPLAIN = !!(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPLAIN

interface Event {
  district: string
  season: string
  trigger: string
  recentRain: number[]
  recentEt0: number[]
  rain: number[]
  et0: number[]
  soilTempC: number | null
  killingDrySpell: boolean
  rain30: number
  et030: number
}

const EVENTS = events as Event[]

/** Print past Vitest's console capture, so `npm run explain` actually shows. */
function report(text: string): void {
  const g = globalThis as { process?: { stdout?: { write(s: string): void } } }
  g.process?.stdout?.write(`${text}\n`)
}

function verdict(e: Event) {
  return evaluateSignal({
    recentRain: e.recentRain,
    forecastRain: e.rain,
    monthNormalMm: 150, // these are all in-season triggers by construction
    recentEt0: e.recentEt0,
    forecastEt0: e.et0,
    soilTempC: e.soilTempC,
  })
}

describe('backtest over 116 real onset events', () => {
  it('has the fixture it claims to have', () => {
    expect(EVENTS.length).toBe(116)
    expect(new Set(EVENTS.map((e) => e.district)).size).toBe(4)
  })

  it('scores the current rule, and the score does not silently get worse', () => {
    const planted = EVENTS.filter((e) => verdict(e).signal === 'plant')
    const badStarts = EVENTS.filter((e) => e.killingDrySpell)
    const falseStarts = planted.filter((e) => e.killingDrySpell)

    // The rainfall rule alone lets through a real share of bad starts. This is
    // the number Milestone 1 Phase 2 exists to bring down; it is recorded here
    // so a change that worsens it fails the build.
    // Recorded so a change that worsens them fails the build.
    expect(planted.length).toBe(66)
    expect(badStarts.length).toBe(38)
    expect(falseStarts.length).toBe(10)
    // The dry-spell check already blocks most bad starts before they reach PLANT.
    expect(badStarts.length - falseStarts.length).toBe(28)

    if (EXPLAIN) {
      const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`
      report(`
  Onset triggers replayed         ${EVENTS.length}
  Followed by a killing dry spell ${badStarts.length}   (${pct(badStarts.length, EVENTS.length)} of all triggers)

  Rainfall rule says PLANT        ${planted.length}
    went badly anyway             ${falseStarts.length}   (${pct(falseStarts.length, planted.length)} of plant calls)
    turned out fine               ${planted.length - falseStarts.length}
  Bad starts the rule blocked     ${badStarts.length - falseStarts.length} of ${badStarts.length}`)
    }
  })

  it('marks most false starts as marginal, which is why it colours rather than vetoes', () => {
    const planted = EVENTS.filter((e) => verdict(e).signal === 'plant')
    const flagged = planted.filter((e) => verdict(e).confidence === 'marginal')
    const caught = flagged.filter((e) => e.killingDrySpell)
    const falseAlarms = flagged.filter((e) => !e.killingDrySpell)
    const missed = planted.filter((e) => e.killingDrySpell && verdict(e).confidence === 'good')

    // Catches most bad starts but raises nearly as many false alarms. Good
    // enough to warn with, not good enough to overrule the farmer.
    expect(flagged.length).toBe(14)
    expect(caught.length).toBe(7)
    expect(missed.length).toBe(3)
    expect(falseAlarms.length).toBe(7)

    if (EXPLAIN) {
      report(`
  Water balance on those ${planted.length} plant calls: ${flagged.length} marked marginal
    correctly warned              ${caught.length} of ${caught.length + missed.length} false starts
    missed                        ${missed.length}
    false alarms                  ${falseAlarms.length}

  Together: ${28 + caught.length} of ${EVENTS.filter((e) => e.killingDrySpell).length} bad starts are blocked or warned about.
  Water balance alone is too noisy to veto a plant call, so it colours it.`)
    }
  })

  it('never calls a start marginal when rain comfortably beat evaporation', () => {
    for (const e of EVENTS) {
      const b = waterBalance(e.rain, e.et0)!
      if (b.ratio >= 1) expect(isMarginal(b)).toBe(false)
    }
  })

  it('agrees with the recorded outcome on the two seasons we checked by hand', () => {
    const good = EVENTS.find((e) => e.district === 'Harare' && e.season === '2017/18')!
    const drought = EVENTS.find((e) => e.district === 'Harare' && e.season === '2015/16')!

    expect(good.trigger).toBe('2017-11-12')
    expect(verdict(good).signal).toBe('plant')
    expect(good.killingDrySpell).toBe(false)

    // The El Nino drought year: the dry-spell rule already catches this one.
    expect(drought.trigger).toBe('2015-11-22')
    expect(verdict(drought).signal).toBe('wait')
    expect(drought.killingDrySpell).toBe(true)
  })
})
