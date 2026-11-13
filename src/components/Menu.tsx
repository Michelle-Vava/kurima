import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { usePopoverExclusion } from './popover'

export interface MenuOption {
  id: string
  label: string
  /** Second line, for the things a one-word label cannot carry. */
  detail?: string
  /** Shown on the right, e.g. "not checked". */
  tag?: string
}

interface Props {
  label: string
  value: string
  options: MenuOption[]
  onChange: (id: string) => void
  /** Rendered in the trigger before the value. */
  icon?: ReactNode
  /** Extra items under the options, e.g. "something else…". */
  footer?: ReactNode
  align?: 'left' | 'right'
  testId?: string
  /** True while whatever this menu chose is being re-fetched. */
  busy?: boolean
}

/**
 * A dropdown for the things a farmer switches between — their district,
 * their crop.
 *
 * These used to be full screens. Changing district meant leaving the answer,
 * choosing from a page, and coming back, which is a lot of ceremony for
 * picking one of eight. A menu keeps the answer on screen behind it, so
 * switching fields feels like switching fields rather than restarting.
 */
export function Menu({ label, value, options, onChange, icon, footer, align = 'left', testId, busy = false }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.id === value)
  const close = useCallback(() => setOpen(false), [])
  const announce = usePopoverExclusion(open, close)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="menu" ref={box}>
      <button
        type="button"
        data-testid={testId}
        className="menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}. Change.`}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) announce()
        }}
      >
        {icon}
        <span className="menu-value">
          <small>{label}</small>
          <strong>{current?.label ?? '—'}</strong>
        </span>
        {busy ? (
          <Loader2 size={16} aria-label="updating" className="spin" />
        ) : (
          <ChevronDown size={16} aria-hidden className={open ? 'menu-chev open' : 'menu-chev'} />
        )}
      </button>

      {open && (
        <div className={`menu-pop menu-${align}`} role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === value}
              className={`menu-item${o.id === value ? ' on' : ''}`}
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
            >
              <span className="menu-tick">{o.id === value && <Check size={15} aria-hidden />}</span>
              <span className="menu-text">
                <strong>{o.label}</strong>
                {o.detail && <small>{o.detail}</small>}
              </span>
              {o.tag && <em className="menu-tag">{o.tag}</em>}
            </button>
          ))}
          {footer && <div className="menu-footer">{footer}</div>}
        </div>
      )}
    </div>
  )
}
