// How old is the weather we're showing? Forecast responses are cached by the
// service worker so the app opens offline, but a cached forecast is only
// useful for a day or two. The response carries its own issue date: the
// "today" in its daily series. Comparing that with the device's date needs no
// HTTP headers and works from cache.

/** Hide the planting recommendation when the forecast is this many days old or more. */
export const MAX_WEATHER_AGE_DAYS = 2

/** `date` as YYYY-MM-DD in the device's local time zone. */
export function localIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Whole days from `issued` (YYYY-MM-DD) to `now`, never negative.
 * A forecast issued today is 0 days old; yesterday's is 1.
 */
export function ageInDays(issued: string, now: Date): number {
  const [iy, im, id] = issued.split('-').map(Number)
  const [ny, nm, nd] = localIsoDate(now).split('-').map(Number)
  if (![iy, im, id].every(Number.isFinite)) return 0
  const days = Math.round((Date.UTC(ny, nm - 1, nd) - Date.UTC(iy, im - 1, id)) / 86_400_000)
  return Math.max(0, days)
}

export function isTooOld(issued: string, now: Date): boolean {
  return ageInDays(issued, now) >= MAX_WEATHER_AGE_DAYS
}
