import { useEffect, useState } from 'react'
import type { Place } from '../lib/openMeteo'
import type { DataSource, Loaded } from '../lib/sources'

export type Async<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; loaded: Loaded<T> }
  | { status: 'error'; message: string }

/** Load one data source for the chosen place, cancelling if the place changes. */
export function useSource<T>(source: DataSource<T>, place: Place | null): Async<T> {
  const [state, setState] = useState<Async<T>>({ status: 'idle' })
  useEffect(() => {
    if (!place) {
      setState({ status: 'idle' })
      return
    }
    const ctrl = new AbortController()
    setState({ status: 'loading' })
    source
      .load(place, ctrl.signal)
      .then((loaded) => setState({ status: 'ok', loaded }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setState({ status: 'error', message: e.message || 'Could not load data.' })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, place?.latitude, place?.longitude])
  return state
}
