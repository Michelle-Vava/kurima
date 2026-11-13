import { AlertTriangle, CircleHelp, CloudRain, Droplets, Sprout, Sun, Timer } from 'lucide-react'
import type { Crop } from '../lib/crops'
import { plural, type OnsetRule, type SignalResult } from '../lib/onset'
import { formatRain, type Units } from '../lib/units'
import { Explain } from './Explain'

/**
 * The verdict, in words, with the crop in it.
 *
 * "Too dry to plant" begged the question — plant what? Every threshold here
 * was derived for maize, and until the heading says so the advice looks more
 * general than it is.
 */
const COPY = {
  plant: { title: (c: string) => `Good time to plant ${c}`, note: 'The rains look established.', Icon: Sprout },
  wait: { title: (c: string) => `Wait before planting ${c}`, note: 'Conditions are close, but not safe yet.', Icon: Timer },
  dry: { title: (c: string) => `Too dry to plant ${c}`, note: 'Not enough rain yet.', Icon: Sun },
  unknown: { title: () => 'Not enough data', note: 'Kurima cannot give an answer from the data it has.', Icon: CircleHelp },
} as const

interface Props {
  result: SignalResult
  soilMoisture: number | null
  units: Units
  crop: Crop
  rule: OnsetRule
  children?: React.ReactNode
}

export function SignalCard({ result, soilMoisture, units, crop, rule, children }: Props) {
  const c = COPY[result.signal]
  const unknown = result.signal === 'unknown'
  const water = result.forecastWater

  return (
    <section className={`card signal signal-${result.signal}`} aria-live="polite" data-signal={result.signal}>
      <div className="signal-head">
        <span className="signal-icon" aria-hidden><c.Icon size={34} strokeWidth={2} /></span>
        <div>
          <h2>{c.title(crop.name.toLowerCase())}</h2>
          <p>{c.note}</p>
        </div>
      </div>

      {!unknown && (
        <div className="stats">
          <Stat
            icon={<CloudRain size={15} aria-hidden />}
            value={formatRain(result.recentWetMm, units.rain)}
            label="rain already fallen"
            tone={result.recentWetMm >= rule.wetMm ? 'good' : undefined}
            title="Rain already fallen"
            explain={
              <>
                <p>
                  The most rain that fell in any {rule.wetDays} days in a row recently. Seed needs the top of the soil
                  wet before it will sprout, and Kurima looks for {formatRain(rule.wetMm, units.rain)}.
                </p>
                <p className="fine">
                  This is a weather model's estimate, not a rain gauge in your field. Today is not counted, because the
                  day is not over.
                </p>
              </>
            }
          />
          <Stat
            icon={<CloudRain size={15} aria-hidden />}
            value={formatRain(result.forecastWetMm, units.rain)}
            label="rain still coming"
            title="Rain still coming"
            explain={
              <p>
                The most rain forecast in any {rule.wetDays} days over the next sixteen. Rain that has not fallen is a
                promise, not water: Kurima never counts it towards the planting threshold.
              </p>
            }
          />
          <Stat
            icon={<Sun size={15} aria-hidden />}
            value={`${result.forecastDrySpell} ${plural(result.forecastDrySpell, 'day')}`}
            label="longest dry run ahead"
            tone={result.forecastDrySpell >= rule.drySpellDays ? 'bad' : 'good'}
            title="Longest dry run ahead"
            explain={
              <p>
                The longest stretch of days ahead with almost no rain. A young seedling's roots only reach the top few
                centimetres, so {rule.drySpellDays} dry days in a row just after sowing can kill it. This is Kurima's
                strongest check.
              </p>
            }
          />
          {water && (
            <Stat
              icon={<Droplets size={15} aria-hidden />}
              value={`${water.netMm > 0 ? '+' : ''}${formatRain(water.netMm, units.rain)}`}
              label="rain minus what the sun takes"
              tone={water.netMm < 0 ? 'bad' : 'good'}
              title="Rain minus what the sun takes"
              explain={
                <>
                  <p>
                    Sun and wind pull water back out of the soil every day, measured in the same millimetres as rain, so
                    the two subtract. Over the next sixteen days the ground is expected to get{' '}
                    {formatRain(water.rainMm, units.rain)} and lose {formatRain(water.et0Mm, units.rain)}.
                  </p>
                  <p className="fine">
                    A negative number means the ground is drying out even if it rains. It is a warning, not a veto — it
                    is right about seven times in ten.
                  </p>
                </>
              }
            />
          )}
          {soilMoisture !== null && (
            <Stat
              icon={<Droplets size={15} aria-hidden />}
              value={`${Math.round(soilMoisture * 100)}%`}
              label="water deeper down"
              title="Water deeper down"
              explain={
                <p>
                  Modelled water in the soil between 9 and 27 cm — below the seed, where roots reach after a week or
                  two. Kurima has no threshold for this yet, so treat it as background rather than as a reason to plant.
                </p>
              }
            />
          )}
        </div>
      )}

      <ul className="reasons">
        {result.reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>

      {result.cautions.length > 0 && (
        <div className={`cautions${result.confidence === 'marginal' ? ' marginal' : ''}`} data-testid="cautions">
          <p className="caution-head">
            <AlertTriangle size={15} aria-hidden />
            {result.confidence === 'marginal' ? 'Conditions are marginal' : 'Worth knowing'}
          </p>
          <ul>{result.cautions.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
      {children}
    </section>
  )
}

function Stat({
  icon,
  value,
  label,
  tone,
  title,
  explain,
}: {
  icon: React.ReactNode
  value: string
  label: string
  tone?: 'good' | 'bad'
  title: string
  explain: React.ReactNode
}) {
  return (
    <div className="stat">
      <Explain title={title} term={explain}>
        <span className={`stat-value${tone ? ` ${tone}` : ''}`}>{value}</span>
        <span className="stat-label">
          {icon}
          {label}
        </span>
      </Explain>
    </div>
  )
}
