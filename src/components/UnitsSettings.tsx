import type { RainUnit, TempUnit, Units } from '../lib/units'

interface Props {
  units: Units
  onChange: (units: Units) => void
}

const RAIN: { value: RainUnit; label: string }[] = [
  { value: 'mm', label: 'Millimetres (mm)' },
  { value: 'in', label: 'Inches (in)' },
]
const TEMP: { value: TempUnit; label: string }[] = [
  { value: 'C', label: 'Celsius (°C)' },
  { value: 'F', label: 'Fahrenheit (°F)' },
]

export function UnitsSettings({ units, onChange }: Props) {
  return (
    <section className="card" data-testid="units">
      <h3>Your units</h3>
      <p className="sub">Kurima converts every screen. The choice stays on this device.</p>
      <div className="rule-grid">
        <label>
          <span>Rain</span>
          <select value={units.rain} onChange={(e) => onChange({ ...units, rain: e.target.value as RainUnit })}>
            {RAIN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          <span>Temperature</span>
          <select value={units.temp} onChange={(e) => onChange({ ...units, temp: e.target.value as TempUnit })}>
            {TEMP.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <p className="fine">
        Weight, area and currency arrive with the soil and market screens, when there is a yield or a price to show.
      </p>
    </section>
  )
}
