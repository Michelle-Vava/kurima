import { describe, expect, it } from 'vitest'
import { DEFAULT_RULE } from '../lib/onset'
import { DEFAULT_SETTINGS, parseSettings } from './settings'

const place = { name: 'Bindura', country: 'Zimbabwe', countryCode: 'ZW', latitude: -17.3, longitude: 31.33 }

describe('parseSettings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
  })
  it('returns the defaults for unreadable JSON', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('"a string"')).toEqual(DEFAULT_SETTINGS)
  })
  it('keeps a valid place, units and rule', () => {
    const stored = JSON.stringify({ place, units: { rain: 'in', temp: 'F' }, rule: { ...DEFAULT_RULE, wetMm: 25 } })
    const s = parseSettings(stored)
    expect(s.place).toEqual(place)
    expect(s.units).toEqual({ rain: 'in', temp: 'F' })
    expect(s.rule.wetMm).toBe(25)
  })
  it('drops a place that is missing coordinates', () => {
    expect(parseSettings(JSON.stringify({ place: { name: 'Nowhere' } })).place).toBeNull()
  })
  it('falls back to known units for anything unrecognised', () => {
    expect(parseSettings(JSON.stringify({ units: { rain: 'cubits', temp: 'K' } })).units).toEqual({ rain: 'mm', temp: 'C' })
  })
  it('ignores non-numeric rule values from an older or tampered store', () => {
    const s = parseSettings(JSON.stringify({ rule: { wetMm: 'lots', wetDays: 5 } }))
    expect(s.rule.wetMm).toBe(DEFAULT_RULE.wetMm)
    expect(s.rule.wetDays).toBe(5)
  })
  it('fills in a rule field a newer version added', () => {
    expect(parseSettings(JSON.stringify({ rule: { wetMm: 25 } })).rule.drySpellDays).toBe(DEFAULT_RULE.drySpellDays)
  })
})
