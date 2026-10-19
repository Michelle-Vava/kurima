import { DEFAULT_RULE, type OnsetRule } from '../lib/onset'

interface Props {
  rule: OnsetRule
  onChange: (rule: OnsetRule) => void
}

const FIELDS: { key: keyof OnsetRule; label: string; unit: string; min: number; max: number }[] = [
  { key: 'wetMm', label: 'Onset rain needed', unit: 'mm', min: 5, max: 80 },
  { key: 'wetDays', label: '…within', unit: 'days', min: 1, max: 10 },
  { key: 'drySpellDays', label: 'Risky dry spell', unit: 'days', min: 3, max: 21 },
]

export function RuleSettings({ rule, onChange }: Props) {
  const isDefault = FIELDS.every((f) => rule[f.key] === DEFAULT_RULE[f.key])
  return (
    <details className="card rules">
      <summary>Local planting rule {isDefault ? '(default)' : '(custom)'}</summary>
      <p className="fine">
        Many ministries publish their own onset rule. Zimbabwe, for example, advises at least 20 mm over 3 days or
        25 mm in a week. Match these to your extension officer's advice.
      </p>
      <div className="rule-grid">
        {FIELDS.map((f) => (
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
              {f.unit}
            </span>
          </label>
        ))}
      </div>
      {!isDefault && (
        <button className="ghost" onClick={() => onChange(DEFAULT_RULE)}>Reset to default</button>
      )}
    </details>
  )
}
