// Real weather, pinned.
//
// docs/how-it-works.md tells two stories about Harare — the 2015 storm that
// tempted and then killed, and the 2017 storm that held — and the Kisumu
// two-seasons problem. Until now those stories lived only in prose and in a
// chart script. These tests tie them to committed slices of the actual ERA5
// record (src/lib/fixtures/era5/, written by scripts/build-data.ts), so if a
// change to the rule stops catching the 2015 trap, a test fails rather than a
// document quietly going stale.

import { describe, expect, it } from 'vitest'
import harare2015 from './fixtures/era5/harare-2015-trap.json'
import harare2017 from './fixtures/era5/harare-2017-good.json'
import kisumu1997 from './fixtures/era5/kisumu-1997.json'
import { monthlyNormals, rainySeasonCount } from './climate'
import { DEFAULT_RULE, evaluateSignal, longestDrySpell, maxRollingSum } from './onset'

interface Slice {
  time: string[]
  rain: (number | null)[]
}

/** The first day the onset rain (20 mm in 3 days) is met, and what follows it. */
function firstTrigger(s: Slice) {
  const rain = s.rain.map((v) => v ?? 0)
  for (let i = DEFAULT_RULE.wetDays - 1; i < rain.length; i++) {
    const wet = maxRollingSum(rain.slice(i - DEFAULT_RULE.wetDays + 1, i + 1), DEFAULT_RULE.wetDays)
    if (wet >= DEFAULT_RULE.wetMm) {
      return { date: s.time[i], index: i, wet, after: rain.slice(i + 1, i + 22) }
    }
  }
  throw new Error('no trigger in slice')
}

describe('Harare, November 2015: the trap', () => {
  const t = firstTrigger(harare2015 as Slice)

  it('tempts: the onset rain falls in the planting window', () => {
    expect(t.date >= '2015-11-15' && t.date <= '2015-11-25').toBe(true)
    expect(t.wet).toBeGreaterThanOrEqual(DEFAULT_RULE.wetMm)
  })

  it('kills: a dry spell long enough to lose a seedling follows within three weeks', () => {
    expect(longestDrySpell(t.after, DEFAULT_RULE.dryDayMm)).toBeGreaterThanOrEqual(DEFAULT_RULE.drySpellDays)
  })

  it('is caught: with the real next days as its forecast, the rule does not say plant', () => {
    // What a farmer with a perfect 16-day forecast would have been told on
    // trigger day. The dry spell is inside the window, so: wait.
    const rain = (harare2015 as Slice).rain.map((v) => v ?? 0)
    const result = evaluateSignal({
      recentRain: rain.slice(0, t.index + 1),
      forecastRain: rain.slice(t.index + 1, t.index + 17),
      monthNormalMm: 78.5, // Harare November normal
    })
    expect(result.signal).not.toBe('plant')
  })
})

describe('Harare, November 2017: the start that held', () => {
  const t = firstTrigger(harare2017 as Slice)

  it('the onset rain falls in the planting window and no killing dry spell follows', () => {
    expect(t.date >= '2017-11-10' && t.date <= '2017-12-05').toBe(true)
    expect(longestDrySpell(t.after, DEFAULT_RULE.dryDayMm)).toBeLessThan(DEFAULT_RULE.drySpellDays)
  })

  it('and the rule, shown the real next days, says plant', () => {
    const rain = (harare2017 as Slice).rain.map((v) => v ?? 0)
    const result = evaluateSignal({
      recentRain: rain.slice(0, t.index + 1),
      forecastRain: rain.slice(t.index + 1, t.index + 17),
      monthNormalMm: 78.5,
    })
    expect(result.signal).toBe('plant')
  })
})

describe('Kisumu, 1997: two rainy seasons in one real year', () => {
  it('reads as two seasons, not one', () => {
    // One year is not a climatology, so this is a sanity check rather than a
    // statistic: even a single real year shows the two wet runs that make a
    // single "usual onset" date meaningless there.
    const s = kisumu1997 as Slice
    const normals = monthlyNormals({ time: s.time, values: s.rain })
    expect(rainySeasonCount(normals)).toBe(2)
  })
})
