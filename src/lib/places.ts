// Where Kurima's advice has been checked.
//
// Milestone 1 focuses on rain-fed maize in Zimbabwe, so the districts offered
// up front are Zimbabwean. Search still reaches any town in Africa, but a
// place outside the pilot country is marked as not yet checked rather than
// quietly given the same advice.

import type { Place } from './openMeteo'

export const PILOT_COUNTRY_CODE = 'ZW'
export const PILOT_COUNTRY = 'Zimbabwe'

/**
 * Pilot districts, spanning Zimbabwe's wetter north-east maize belt through to
 * the drier south-west. Each is the main town of its district; names,
 * provinces and coordinates come from the Open-Meteo geocoding API
 * (https://open-meteo.com/, CC BY 4.0), the same source the search box uses.
 */
export const PILOT_DISTRICTS: Place[] = [
  { name: 'Bindura', region: 'Mashonaland Central', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -17.30192, longitude: 31.33056 },
  { name: 'Chinhoyi', region: 'Mashonaland West', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -17.36667, longitude: 30.2 },
  { name: 'Marondera', region: 'Mashonaland East', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -18.18527, longitude: 31.55193 },
  { name: 'Harare', region: 'Harare', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -17.82772, longitude: 31.05337 },
  { name: 'Mutare', region: 'Manicaland', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -18.9707, longitude: 32.67086 },
  { name: 'Gweru', region: 'Midlands', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -19.45, longitude: 29.81667 },
  { name: 'Masvingo', region: 'Masvingo', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -20.06373, longitude: 30.82766 },
  { name: 'Gwanda', region: 'Matabeleland South', country: PILOT_COUNTRY, countryCode: PILOT_COUNTRY_CODE, latitude: -20.93622, longitude: 29.00698 },
]

/**
 * How far Kurima's advice can be trusted at a place.
 *
 * `checked`: the planting rule is being validated against past seasons here.
 * `weather-only`: the forecast is right, but the rule has not been reviewed
 * for this place, so the plant-or-wait answer is a rough guide.
 */
export type Coverage = 'checked' | 'weather-only'

export function coverageOf(place: Place): Coverage {
  return place.countryCode === PILOT_COUNTRY_CODE ? 'checked' : 'weather-only'
}

/** Is this somewhere Kurima's planting rule has been checked? */
export function isPilotPlace(place: Place): boolean {
  return coverageOf(place) === 'checked'
}

export function placeKey(place: Place): string {
  return `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`
}

/**
 * The place's region and country, for the line under its name. The region is
 * left out where it repeats the name, as it does for Harare and Bulawayo.
 */
export function describePlace(place: Place): string {
  const region = place.region && place.region !== place.name ? place.region : null
  return [region, place.country].filter(Boolean).join(', ')
}
