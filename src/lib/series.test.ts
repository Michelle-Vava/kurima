import { describe, expect, it } from 'vitest'
import { coverage, densify, fullyCovered, sumRange, valueOn } from './series'

describe('densify', () => {
  it('puts a row on every calendar day between the first and the last', () => {
    const d = densify({ time: ['2020-01-01', '2020-01-04'], values: [5, 7] })
    expect(d.from).toBe('2020-01-01')
    expect(d.to).toBe('2020-01-04')
    expect(d.mm).toEqual([5, null, null, 7])
  })
  it('treats an absent row and a null reading as the same thing: unknown', () => {
    const absent = densify({ time: ['2020-01-01', '2020-01-03'], values: [5, 7] })
    const nulled = densify({ time: ['2020-01-01', '2020-01-02', '2020-01-03'], values: [5, null, 7] })
    expect(absent.mm).toEqual(nulled.mm)
  })
  it('does not mistake unknown for no rain', () => {
    expect(valueOn(densify({ time: ['2020-01-01'], values: [null] }), '2020-01-01')).toBeNull()
  })
  it('copes with rows out of order', () => {
    const d = densify({ time: ['2020-01-03', '2020-01-01'], values: [7, 5] })
    expect(d.mm).toEqual([5, null, 7])
  })
  it('is empty for an empty series', () => {
    expect(densify({ time: [], values: [] }).mm).toEqual([])
  })
})

describe('coverage and sums', () => {
  const d = densify({ time: ['2020-01-01', '2020-01-02', '2020-01-04'], values: [1, null, 4] })

  it('counts the days it actually has', () => {
    expect(coverage(d, '2020-01-01', '2020-01-04')).toEqual({ have: 2, want: 4 })
  })
  it('counts days beyond the record against the total, not for it', () => {
    expect(coverage(d, '2020-01-01', '2020-01-10')).toEqual({ have: 2, want: 10 })
  })
  it('refuses to total a range with a hole in it', () => {
    expect(sumRange(d, '2020-01-01', '2020-01-04')).toBeNull()
    expect(sumRange(d, '2020-01-03', '2020-01-04')).toBeNull() // 3 Jan is outside no range, it is unknown
    expect(sumRange(d, '2020-01-04', '2020-01-04')).toBe(4)
  })
  it('refuses to total a range that runs off the record', () => {
    expect(sumRange(d, '2020-01-04', '2020-01-05')).toBeNull()
  })
  it('reports full cover only when every day has a reading', () => {
    expect(fullyCovered(d, '2020-01-01', '2020-01-01')).toBe(true)
    expect(fullyCovered(d, '2020-01-01', '2020-01-02')).toBe(false)
  })
})
