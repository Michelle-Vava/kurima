import { SECTIONS, type TabId } from '../lib/tabs'

interface Props {
  tab: TabId
  onChange: (tab: TabId) => void
}

/**
 * The whole app in one bar: the farming year on the left, the app's own
 * screens on the right. Sections that are not built yet are shown and are
 * reachable — they explain themselves rather than pretending to be missing.
 */
export function Nav({ tab, onChange }: Props) {
  const farm = SECTIONS.filter((s) => s.group === 'farm')
  const app = SECTIONS.filter((s) => s.group === 'app')

  const button = (s: (typeof SECTIONS)[number]) => (
    <button
      key={s.id}
      type="button"
      className={`tab${s.id === tab ? ' active' : ''}${s.status === 'soon' ? ' soon' : ''}`}
      aria-current={s.id === tab ? 'page' : undefined}
      onClick={() => onChange(s.id)}
      title={s.blurb}
    >
      {s.label}
      {s.status === 'soon' && <span className="soon-dot" aria-label="not built yet" />}
    </button>
  )

  return (
    <nav className="tabs" aria-label="Sections">
      <div className="tab-group">{farm.map(button)}</div>
      <div className="tab-group tab-group-app">{app.map(button)}</div>
    </nav>
  )
}
