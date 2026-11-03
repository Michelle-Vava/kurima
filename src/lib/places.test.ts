import { describe, expect, it } from 'vitest'
import { PILOT_COUNTRY_CODE, PILOT_DISTRICTS, describePlace, isPilotPlace, placeKey } from './places'

describe('pilot districts', () => {
  it('are all in the pilot country', () => {
    for (const d of PILOT_DISTRICTS) expect(d.countryCode).toBe(PILOT_COUNTRY_CODE)
  })
  it('have no duplicates', () => {
    expect(new Set(PILOT_DISTRICTS.map(placeKey)).size).toBe(PILOT_DISTRICTS.length)
    expect(new Set(PILOT_DISTRICTS.map((d) => d.name)).size).toBe(PILOT_DISTRICTS.length)
  })
  it('sit inside Zimbabwe\'s bounding box', () => {
    for (const d of PILOT_DISTRICTS) {
      expect(d.latitude).toBeGreaterThan(-22.5)
      expect(d.latitude).toBeLessThan(-15.5)
      expect(d.longitude).toBeGreaterThan(25)
      expect(d.longitude).toBeLessThan(33.5)
    }
  })
  it('span wetter north-east to drier south-west', () => {
    const names = PILOT_DISTRICTS.map((d) => d.name)
    expect(names).toContain('Bindura')
    expect(names).toContain('Gwanda')
  })
  it('name a province for each district', () => {
    for (const d of PILOT_DISTRICTS) expect(d.region).toBeTruthy()
  })
})

describe('isPilotPlace', () => {
  const elsewhere = { name: 'Kano', country: 'Nigeria', countryCode: 'NG', latitude: 12, longitude: 8.5 }
  it('is true for a pilot district and false elsewhere', () => {
    expect(isPilotPlace(PILOT_DISTRICTS[0])).toBe(true)
    expect(isPilotPlace(elsewhere)).toBe(false)
  })
})

describe('describePlace', () => {
  it('joins the parts it has', () => {
    expect(describePlace(PILOT_DISTRICTS[0])).toBe('Mashonaland Central, Zimbabwe')
    expect(describePlace({ name: 'X', country: 'Zimbabwe', countryCode: 'ZW', latitude: 0, longitude: 0 })).toBe('Zimbabwe')
  })
  it('does not repeat a region that shares the district name', () => {
    const harare = PILOT_DISTRICTS.find((d) => d.name === 'Harare')!
    expect(harare.region).toBe('Harare')
    expect(describePlace(harare)).toBe('Zimbabwe')
  })
})
