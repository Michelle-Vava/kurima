import { Check, Database, Palette, Ruler, SlidersHorizontal } from 'lucide-react'
import { RuleSettings } from '../components/RuleSettings'
import { UnitsSettings } from '../components/UnitsSettings'
import type { OnsetRule } from '../lib/onset'
import { PILOT_COUNTRY } from '../lib/places'
import { climateSource, forecastSource, seasonalSource } from '../lib/sources'
import { THEMES, type ThemeId } from '../lib/themes'
import type { Units } from '../lib/units'

interface Props {
  rule: OnsetRule
  units: Units
  theme: ThemeId
  onRuleChange: (rule: OnsetRule) => void
  onUnitsChange: (units: Units) => void
  onThemeChange: (theme: ThemeId) => void
}

const SOURCES = [forecastSource, climateSource, seasonalSource]

export function SettingsScreen({ rule, units, theme, onRuleChange, onUnitsChange, onThemeChange }: Props) {
  return (
    <div className="settings">
      <section className="card">
        <h3><Palette size={17} aria-hidden /> Look</h3>
        <p className="sub">
          Colours in Kurima carry meaning — green is go, amber is careful, rust is no — so each theme restates them at
          a contrast that works on its own background.
        </p>
        <div className="themes" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === theme}
              className={`theme-card${t.id === theme ? ' on' : ''}`}
              onClick={() => onThemeChange(t.id)}
            >
              <span className="theme-swatch" aria-hidden>
                {t.preview.map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="theme-text">
                <strong>
                  {t.label}
                  {t.id === theme && <Check size={14} aria-hidden />}
                </strong>
                <small>{t.hint}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3><Ruler size={17} aria-hidden /> Units</h3>
        <UnitsSettings units={units} onChange={onUnitsChange} />
      </section>

      <section className="card">
        <h3><SlidersHorizontal size={17} aria-hidden /> The planting rule</h3>
        <p className="sub">
          Most farmers never need to touch these. They are here because national services publish their own
          thresholds, and an extension officer may want Kurima to match theirs.
        </p>
        <RuleSettings rule={rule} units={units} onChange={onRuleChange} />
      </section>

      <section className="card" data-testid="about">
        <h3><Database size={17} aria-hidden /> Where the data comes from</h3>
        <ul className="sources">
          {SOURCES.map((s) => (
            <li key={s.meta.id}>
              <a href={s.meta.url} target="_blank" rel="noreferrer">{s.meta.label}</a> ({s.meta.licence})
            </li>
          ))}
        </ul>
        <p className="fine">
          Kurima has no account and no server. Your district and settings are kept on this device only. The planting
          rule has been checked for {PILOT_COUNTRY} so far; elsewhere the weather is right but the advice is not yet
          reviewed.
        </p>
      </section>
    </div>
  )
}
