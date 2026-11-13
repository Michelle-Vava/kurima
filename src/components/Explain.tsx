import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { usePopoverExclusion } from './popover'

/**
 * A number you can tap to find out what it means.
 *
 * Kurima's screens are full of terms a farmer has no reason to know —
 * "wettest recent spell (modelled)", "rain minus what the sun takes". The
 * answer to each is two sentences, which is too much to print beside every
 * figure and too important to leave in a document nobody opens. So it lives
 * on the figure itself, one tap away, and the screen stays short.
 */
export function Explain({
  term,
  children,
  title,
}: {
  /** The plain-words explanation. */
  term: ReactNode
  /** The thing being explained. */
  children: ReactNode
  /** Heading for the panel; defaults to the label text. */
  title: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const announce = usePopoverExclusion(open, close)

  // Tapping anywhere else dismisses the panel, the same as the menus: the
  // screen never collects a trail of open explanations.
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open, close])

  return (
    <div className={`explain${open ? ' open' : ''}`} ref={box}>
      <button
        type="button"
        className="explain-trigger"
        aria-expanded={open}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) announce()
        }}
        title={`What does "${title}" mean?`}
      >
        {children}
        <HelpCircle size={14} className="explain-mark" aria-hidden />
        <span className="sr-only">— what does this mean?</span>
      </button>
      {open && (
        <div className="explain-body" role="note">
          <button type="button" className="explain-close" onClick={() => setOpen(false)} aria-label="Close">
            <X size={14} aria-hidden />
          </button>
          <h4>{title}</h4>
          {term}
        </div>
      )}
    </div>
  )
}
