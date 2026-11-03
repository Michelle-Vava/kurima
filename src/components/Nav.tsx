import { TABS, type TabId } from '../lib/tabs'

interface Props {
  tab: TabId
  onChange: (tab: TabId) => void
}

export function Nav({ tab, onChange }: Props) {
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={t.id === tab ? 'tab active' : 'tab'}
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
