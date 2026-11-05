import { RuleSettings } from '../components/RuleSettings'
import { UnitsSettings } from '../components/UnitsSettings'
import type { OnsetRule } from '../lib/onset'
import { PILOT_COUNTRY } from '../lib/places'
import { climateSource, forecastSource, seasonalSource } from '../lib/sources'
import type { Units } from '../lib/units'

interface Props {
  rule: OnsetRule
  units: Units
  onRuleChange: (rule: OnsetRule) => void
  onUnitsChange: (units: Units) => void
}

const SOURCES = [forecastSource, climateSource, seasonalSource]

export function SettingsScreen({ rule, units, onRuleChange, onUnitsChange }: Props) {
  return (
    <>
      <RuleSettings rule={rule} units={units} onChange={onRuleChange} />
      <UnitsSettings units={units} onChange={onUnitsChange} />
      <section className="card" data-testid="about">
        <h3>Where the data comes from</h3>
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
    </>
  )
}
