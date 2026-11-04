// Properties that must hold whatever the numbers are.
//
// Unit tests check the code does what we said. These check that what we said
// is not self-contradictory: more rain must never make the advice worse, more
// evaporation must never make it better. They catch sign errors and inverted
// comparisons that example-based tests walk straight past.

import { describe, expect, it } from 'vitest'
import { evaluateSignal, type SignalInput, type SignalResult } from './onset'
import { waterBalance } from './water'

const RANK: Record<SignalResult['signal'], number> = { unknown: 0, dry: 1, wait: 2, plant: 3 }

function base(over: Partial<SignalInput> = {}): SignalInput {
  return {
    recentRain: [0, 0, 0, 5, 5, 5],
    forecastRain: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    monthNormalMm: 150,
    ...over,
  }
}

/** A deterministic spread of inputs; no randomness, so a failure is reproducible. */
const CASES: SignalInput[] = []
for (const r of [0, 3, 8, 20]) {
  for (const f of [0, 1, 4]) {
    for (const normal of [5, 150]) {
      CASES.push(base({ recentRain: [0, 0, 0, r, r, r], forecastRain: new Array(10).fill(f), monthNormalMm: normal }))
    }
  }
}

describe('signal properties', () => {
  it('more recent rain never makes the advice more negative', () => {
    for (const c of CASES) {
      const low = evaluateSignal(c)
      const high = evaluateSignal({ ...c, recentRain: c.recentRain.map((v) => v + 5) })
      expect(RANK[high.signal]).toBeGreaterThanOrEqual(RANK[low.signal])
    }
  })

  it('more forecast rain never makes the advice more negative', () => {
    for (const c of CASES) {
      const low = evaluateSignal(c)
      const high = evaluateSignal({ ...c, forecastRain: c.forecastRain.map((v) => v + 3) })
      expect(RANK[high.signal]).toBeGreaterThanOrEqual(RANK[low.signal])
    }
  })

  it('more evaporation never improves confidence', () => {
    for (const c of CASES) {
      const wet = evaluateSignal({ ...c, forecastEt0: c.forecastRain.map(() => 1) })
      const dry = evaluateSignal({ ...c, forecastEt0: c.forecastRain.map(() => 9) })
      if (wet.confidence === 'marginal') expect(dry.confidence).toBe('marginal')
    }
  })

  it('evaporation never changes the verdict itself, only the confidence', () => {
    for (const c of CASES) {
      const plain = evaluateSignal(c)
      const thirsty = evaluateSignal({
        ...c,
        recentEt0: c.recentRain.map(() => 9),
        forecastEt0: c.forecastRain.map(() => 9),
      })
      expect(thirsty.signal).toBe(plain.signal)
    }
  })

  it('never says plant outside the rainy season, however wet it is', () => {
    const r = evaluateSignal(base({ recentRain: [50, 50, 50], forecastRain: new Array(10).fill(10), monthNormalMm: 2 }))
    expect(r.signal).not.toBe('plant')
  })

  it('reports a water balance exactly when ET0 is supplied', () => {
    const without = evaluateSignal(base())
    expect(without.recentWater).toBeNull()
    expect(without.forecastWater).toBeNull()
    const c = base()
    const with_ = evaluateSignal({ ...c, recentEt0: c.recentRain.map(() => 4), forecastEt0: c.forecastRain.map(() => 4) })
    expect(with_.recentWater).toEqual(waterBalance(c.recentRain, c.recentRain.map(() => 4)))
  })

  it('flags soil that is too cold or too hot, and leaves the verdict alone', () => {
    const c = base({ recentRain: [0, 0, 0, 10, 10, 10] })
    const ok = evaluateSignal({ ...c, soilTempC: 22 })
    const cold = evaluateSignal({ ...c, soilTempC: 8 })
    const hot = evaluateSignal({ ...c, soilTempC: 40 })
    expect(ok.cautions).toHaveLength(0)
    expect(cold.cautions.join(' ')).toContain('too cold')
    expect(hot.cautions.join(' ')).toContain('hot enough to hurt')
    expect(cold.signal).toBe(ok.signal)
    expect(hot.signal).toBe(ok.signal)
  })

  it('says when the forecast is not confident of rain', () => {
    const c = base()
    expect(evaluateSignal({ ...c, rainProbability: new Array(10).fill(10) }).cautions.join(' ')).toContain('not confident')
    expect(evaluateSignal({ ...c, rainProbability: new Array(10).fill(90) }).cautions.join(' ')).not.toContain('not confident')
  })
})
