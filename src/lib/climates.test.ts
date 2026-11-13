// Every season statistic, run over four rainfall regimes rather than one.
//
// Zimbabwe is the only place Kurima gives advice about, and will be for a
// while. These tests exist anyway, because the cost of discovering that a
// function assumed Zimbabwe is paid when a second country is promised, and by
// then the function has callers. The shapes are synthetic (see
// fixtures/climates.ts); what is asserted is shape, never a rainfall figure
// anyone should believe.

import { describe, expect, it } from 'vitest'
import { monthlyNormals, rainySeasonCount } from './climate'
import { climateFromSeries, seasonAudit } from './climatePack'
import { CLIMATE_SHAPES, expectedNormals, shape, thirtyYears } from './fixtures/climates'
import { onsetStats, typicalOnset } from './season'
import { seasonContext } from './seasonContext'

const TODAY = '2026-11-06'

describe('monthly normals, across regimes', () => {
  it.each(CLIMATE_SHAPES)('recovers the monthly shape of $label', (s) => {
    const got = monthlyNormals(thirtyYears(s))
    const want = expectedNormals(s)
    got.forEach((mm, i) => {
      // A seeded draw of 30 samples, so loose: the assertion is "this month is
      // about this wet", which is all the derivation claims.
      expect(Math.abs(mm - want[i])).toBeLessThan(Math.max(12, want[i] * 0.35))
    })
  })
})

describe('the farming year starts in the driest month', () => {
  it('is August south of the equator and January in the Sahel', () => {
    expect(climateFromSeries(thirtyYears(shape('harare'))).startMonth).toBe(8)
    expect(climateFromSeries(thirtyYears(shape('kano'))).startMonth).toBe(1)
  })
  it('never splits the rainy season it is meant to contain', () => {
    for (const s of CLIMATE_SHAPES) {
      const c = climateFromSeries(thirtyYears(s))
      const wettest = c.normals.indexOf(Math.max(...c.normals)) + 1
      expect(c.startMonth).not.toBe(wettest)
    }
  })
})

describe('rainySeasonCount', () => {
  it('reads one season from a single summer peak, either hemisphere', () => {
    expect(rainySeasonCount(monthlyNormals(thirtyYears(shape('harare'))))).toBe(1)
    expect(rainySeasonCount(monthlyNormals(thirtyYears(shape('kano'))))).toBe(1)
  })
  it('does not split a season that straddles the new year', () => {
    // Real Harare normals: wet Dec–Mar, which is one season, not two.
    expect(rainySeasonCount([215.2, 144.4, 92.7, 27.5, 6.3, 1.7, 1.2, 0.7, 3.2, 21.3, 78.5, 178.7])).toBe(1)
  })
  it('reads two from East Africa’s long and short rains', () => {
    expect(rainySeasonCount(monthlyNormals(thirtyYears(shape('kisumu'))))).toBe(2)
  })
  it('reads none where there is no rain worth farming by', () => {
    expect(rainySeasonCount(monthlyNormals(thirtyYears(shape('aswan'))))).toBe(0)
  })
})

describe('typical onset, across regimes', () => {
  it('lands in the Zimbabwean planting window', () => {
    const c = climateFromSeries(thirtyYears(shape('harare')))
    const stats = onsetStats(c.onsetDoys, c.startMonth)!
    const date = typicalOnset(stats, TODAY).date
    expect(date >= '2026-11-01' && date <= '2026-12-15').toBe(true)
  })

  it('lands in the Sahel planting window, where the year starts in January', () => {
    const c = climateFromSeries(thirtyYears(shape('kano')))
    const stats = onsetStats(c.onsetDoys, c.startMonth)!
    const date = typicalOnset(stats, TODAY).date
    expect(date >= '2026-05-15' && date <= '2026-07-15').toBe(true)
  })

  it('says nothing at all where there are two rainy seasons', () => {
    // Regression guard. Before rainySeasonCount, Kisumu was handed a single
    // median of both seasons' onsets and reported it as fact: a February date,
    // which is neither the long rains (March) nor the short ones (October).
    const c = climateFromSeries(thirtyYears(shape('kisumu')))
    const stats = onsetStats(c.onsetDoys, c.startMonth)!
    const naive = typicalOnset(stats, TODAY).date
    expect(naive >= '2026-02-01' && naive <= '2026-03-01').toBe(true) // the wrong answer, still computable

    const ctx = seasonContext(c, TODAY, null, [])
    expect(ctx.typical).toBeNull()
    expect(ctx.noTypical).toBe('two-seasons')
  })

  it('says nothing where there is no rainy season', () => {
    const c = climateFromSeries(thirtyYears(shape('aswan')))
    const ctx = seasonContext(c, TODAY, null, [])
    expect(ctx.typical).toBeNull()
    expect(ctx.noTypical).toBe('no-season')
    expect(seasonAudit(c).withOnset).toBe(0)
  })
})

describe('season audit', () => {
  it('accounts for every season the record spans', () => {
    for (const s of CLIMATE_SHAPES) {
      const a = seasonAudit(climateFromSeries(thirtyYears(s)))
      expect(a.incomplete).toBe(0) // a clean record leaves nothing unjudgeable
      expect(a.inRecord).toBe(a.withOnset + a.withoutOnset! + a.incomplete!)
      expect(a.inRecord).toBeGreaterThanOrEqual(29)
    }
  })
  it('separates "the rains never came" from "we could not tell"', () => {
    const a = seasonAudit(climateFromSeries(thirtyYears(shape('aswan'))))
    expect(a.withoutOnset).toBeGreaterThan(0)
    expect(a.incomplete).toBe(0)
  })
})
