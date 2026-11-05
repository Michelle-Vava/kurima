import { describe, expect, it } from 'vitest'
import { climateFromSeries } from './climatePack'
import { addDays } from './season'
import { seasonContext } from './seasonContext'

/** Twelve synthetic Harare-like seasons: dry Apr–Nov, 8 mm a day from 20 Nov to March, so 20 mm is reached on 22 Nov. */
function history() {
  const time: string[] = []
  const values: number[] = []
  for (let d = '1991-01-01'; d <= '2003-12-31'; d = addDays(d, 1)) {
    const m = Number(d.slice(5, 7))
    const day = Number(d.slice(8, 10))
    let mm = 0
    if (m === 11 && day >= 20) mm = 8
    else if (m === 12 || m <= 3) mm = 8
    time.push(d)
    values.push(mm)
  }
  return { time, values }
}
const climate = climateFromSeries(history())

describe('seasonContext', () => {
  it('derives the start month and a typical onset from the history', () => {
    expect(climate.startMonth).toBeGreaterThanOrEqual(4) // some dry month
    const ctx = seasonContext(climate, '2026-11-04', null, [])
    expect(ctx.typical).not.toBeNull()
    expect(ctx.typical!.date.slice(5)).toBe('11-22') // 20 mm reached on the third wet day
    expect(ctx.typical!.daysAway).toBe(18)
  })

  it('ranks this season so far against past ones, cut off at a matching day', () => {
    // A wet October this year: 60 mm where past years had 0.
    const archive = { time: ['2026-10-01', '2026-10-02'], values: [30, 30] }
    const ctx = seasonContext(climate, '2026-11-04', archive, [])
    // Archive alone leaves most of the season uncovered, so nothing is claimed...
    expect(ctx.soFar).toBeNull()
  })

  it('speaks once most days are accounted for, filling the archive lag from recent days', () => {
    const from = `2026-${String(climate.startMonth).padStart(2, '0')}-01`
    const time: string[] = []
    const values: number[] = []
    for (let d = from; d <= '2026-10-31'; d = addDays(d, 1)) {
      time.push(d)
      values.push(0)
    }
    const recent: [string, number][] = [['2026-11-01', 0], ['2026-11-02', 40], ['2026-11-03', 0]]
    const ctx = seasonContext(climate, '2026-11-04', { time, values }, recent)
    expect(ctx.soFar).not.toBeNull()
    expect(ctx.soFar!.from).toBe(from)
    expect(ctx.soFar!.through <= '2026-11-03').toBe(true)
    expect(ctx.soFar!.rank).toBeGreaterThanOrEqual(0)
    expect(ctx.soFar!.rank).toBeLessThanOrEqual(1)
  })

  it('says nothing about the season before it has started', () => {
    const start = `2026-${String(climate.startMonth).padStart(2, '0')}-01`
    expect(seasonContext(climate, start, null, []).soFar).toBeNull()
  })
})
