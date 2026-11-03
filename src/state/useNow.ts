import { useEffect, useState } from 'react'

/**
 * The current time, refreshed on a timer.
 *
 * Calling `new Date()` straight in a render is unstable, and Kurima is a PWA
 * a farmer may leave open for hours: without this, a forecast issued
 * "today" would still say so tomorrow morning.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
