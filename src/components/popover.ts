// One popover at a time.
//
// The menus and the tap-to-explain panels each knew how to close themselves,
// but not about each other: open the crop menu, then tap a figure, and both
// sat on screen at once. Rather than threading shared state through every
// screen, each popover announces itself on a document event when it opens,
// and every other open popover hears it and closes. No context, no store —
// the popovers are strangers and can stay that way.

import { useEffect, useId } from 'react'

const EVENT = 'kurima:popover-opened'

/**
 * Call from a popover component. Returns the announce function to call when
 * it opens; while `open`, closes it the moment any other popover announces.
 */
export function usePopoverExclusion(open: boolean, close: () => void): () => void {
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onAnnounce = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) close()
    }
    document.addEventListener(EVENT, onAnnounce)
    return () => document.removeEventListener(EVENT, onAnnounce)
  }, [open, close, id])

  return () => document.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
}
