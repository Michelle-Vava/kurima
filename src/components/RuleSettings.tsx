import { DEFAULT_RULE, type OnsetRule } from '../lib/onset'
import { convertRain, rainToMm, rainUnitLabel, type Units } from '../lib/units'

interface Props {
  rule: OnsetRule
  units: Units
  onChange: (rule: OnsetRule) => void
}

const DAY_FIELDS: { key: keyof OnsetRule; label: string; min: number; max: number }[] = [
  { key: 'wetDays', label: '…within', min: 1, max: 10 },
  { key: 'drySpellDays', label: 'Risky dry spell', min: 3, max: 21 },
]

export function RuleSettings({ rule, units, onChange }: Props) {
  const isDefault = (['wetMm', 'wetDays', 'drySpellDays'] as const).every((k) => rule[k] === DEFAULT_RULE[k])
  const inches = units.rain === 'in'
  // The rule is stored in millimetres, which is how national services publish
  // it; only the box the farmer types into changes unit.
  const wetValue = inches ? Math.round(convertRain(rule.wetMm, 'in') * 100) / 100 : rule.wetMm

  return (
    <section className="card rules" data-testid="rule-settings">
      <h3>Local planting rule {isDefault ? '(default)' : '(custom)'}</h3>
      <p className="fine">
        Many ministries publish their own onset rule. Zimbabwe, for example, advises at least 20 mm over 3 days or
        25 mm in a week. Match these to your extension officer's advice.
      </p>
      <div className="rule-grid">
        <label>
          <span>Onset rain needed</span>
          <span className="input-unit">
            <input
              type="number"
              min={inches ? 0.2 : 5}
              max={inches ? 3.2 : 80}
              step={inches ? 0.05 : 1}
              value={wetValue}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (!Number.isFinite(v)) return
                const mm = rainToMm(v, units.rain)
                if (mm >= 5 && mm <= 80) onChange({ ...rule, wetMm: Math.round(mm * 10) / 10 })
              }}
            />
            {rainUnitLabel(units.rain)}
          </span>
        </label>
        {DAY_FIELDS.map((f) => (
          <label key={f.key}>
            <span>{f.label}</span>
            <span className="input-unit">
              <input
                type="number"
                min={f.min}
                max={f.max}
                value={rule[f.key]}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v >= f.min && v <= f.max) onChange({ ...rule, [f.key]: v })
                }}
              />
              days
            </span>
          </label>
        ))}
      </div>
      {!isDefault && (
        <button className="ghost" onClick={() => onChange(DEFAULT_RULE)}>Reset to default</button>
      )}
    </section>
  )
}
