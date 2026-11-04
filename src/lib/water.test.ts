import { describe, expect, it } from 'vitest'
import { MARGINAL_WATER_RATIO } from './agronomy'
import { isMarginal, waterBalance } from './water'

describe('waterBalance', () => {
  it('reports what the ground kept, not what fell', () => {
    // Harare, the 14 completed days to 2 Nov 2026: 7.5 mm rain, 92.7 mm ET0.
    const b = waterBalance([7.5], [92.7])!
    expect(b.rainMm).toBe(7.5)
    expect(b.et0Mm).toBe(92.7)
    expect(b.netMm).toBe(-85.2)
    expect(b.ratio).toBeCloseTo(0.08, 2)
  })
  it('sums day by day', () => {
    const b = waterBalance([10, 0, 5], [4, 4, 4])!
    expect(b.rainMm).toBe(15)
    expect(b.et0Mm).toBe(12)
    expect(b.netMm).toBe(3)
    expect(b.ratio).toBe(1.25)
  })
  it('pairs only days it has both numbers for', () => {
    expect(waterBalance([5, 5, 5], [2, 2])!.rainMm).toBe(10)
  })
  it('is null with nothing to compare', () => {
    expect(waterBalance([], [])).toBeNull()
    expect(waterBalance([5], [])).toBeNull()
  })
  it('treats no rain and no demand as keeping pace', () => {
    expect(waterBalance([0, 0], [0, 0])!.ratio).toBe(1)
  })
})

describe('isMarginal', () => {
  it('fires below the reviewed ratio and not above it', () => {
    expect(isMarginal(waterBalance([4], [10]))).toBe(true) // 0.40
    expect(isMarginal(waterBalance([6], [10]))).toBe(false) // 0.60
    expect(isMarginal(waterBalance([MARGINAL_WATER_RATIO * 10], [10]))).toBe(false)
  })
  it('says nothing when there is no ET0 to compare against', () => {
    expect(isMarginal(null)).toBe(false)
  })
})
