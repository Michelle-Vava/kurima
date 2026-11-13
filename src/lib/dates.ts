// Calendar arithmetic on YYYY-MM-DD strings.
//
// Kept apart from season.ts so that series.ts can use it without the two
// importing each other. Everything here is UTC: these are calendar dates, not
// instants, and a date must not shift because the device is in another zone.

/** `start` plus `days`, as YYYY-MM-DD. Negative `days` goes back. */
export function addDays(start: string, days: number): string {
  const [y, m, d] = start.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "27 Nov", for a date a farmer reads rather than one a machine sorts. */
export function shortDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
}
