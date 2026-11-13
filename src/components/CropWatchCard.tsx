import { AlertTriangle, CalendarCheck, Droplets, Sprout, Sun } from 'lucide-react'
import type { Crop } from '../lib/crops'
import { daysBetween, shortDate } from '../lib/dates'
import { longestDrySpell, plural, type OnsetRule } from '../lib/onset'
import type { WaterBalance } from '../lib/water'
import { formatRain, type Units } from '../lib/units'
import { Explain } from './Explain'

/** A seedling is at its most fragile for about this long after sowing. */
export const FRAGILE_DAYS = 21

interface Props {
  crop: Crop
  plantedOn: string
  today: string
  /** Forecast rain from today onwards (mm). */
  forecastRain: number[]
  water: WaterBalance | null
  rule: OnsetRule
  units: Units
  children?: React.ReactNode
}

/**
 * Once the seed is in, the question changes.
 *
 * "Should I plant?" becomes "will what I planted survive, and when will it be
 * ready?" — and those are answered by the checks Kurima already runs, pointed
 * at a standing crop instead of at a decision. The dry-spell rule is the same
 * rule; it just means something different three days after sowing than it did
 * three days before.
 */
export function CropWatchCard({ crop, plantedOn, today, forecastRain, water, rule, units, children }: Props) {
  const age = daysBetween(plantedOn, today)
  const drySpell = longestDrySpell(forecastRain, rule.dryDayMm)
  const fragile = age <= FRAGILE_DAYS
  const atRisk = fragile && drySpell >= rule.drySpellDays
  const toHarvest = crop.daysToMaturity - age

  return (
    <section className={`card signal ${atRisk ? 'signal-dry' : 'signal-plant'}`} aria-live="polite" data-crop-watch>
      <div className="signal-head">
        <span className="signal-icon" aria-hidden>{atRisk ? <AlertTriangle size={34} /> : <Sprout size={34} />}</span>
        <div>
          <h2>
            {atRisk
              ? `Your ${crop.name.toLowerCase()} is at risk`
              : fragile
                ? `Your ${crop.name.toLowerCase()} is getting established`
                : `Your ${crop.name.toLowerCase()} is growing`}
          </h2>
          <p>
            Sown {shortDate(plantedOn)} — {age === 0 ? 'today' : `${age} ${plural(age, 'day')} ago`}.
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <Explain
            title="Longest dry run ahead"
            term={
              <p>
                The longest stretch of days ahead with almost no rain.{' '}
                {fragile
                  ? `Your crop is ${age} ${plural(age, 'day')} old, so its roots are still in the top few centimetres. ${rule.drySpellDays} dry days in a row now can kill it.`
                  : 'Past about three weeks the roots are deep enough that a short dry spell is uncomfortable rather than fatal.'}
              </p>
            }
          >
            <span className={`stat-value${atRisk ? ' bad' : ' good'}`}>
              {drySpell} {plural(drySpell, 'day')}
            </span>
            <span className="stat-label">
              <Sun size={15} aria-hidden />
              longest dry run ahead
            </span>
          </Explain>
        </div>

        {water && (
          <div className="stat">
            <Explain
              title="Rain minus what the sun takes"
              term={
                <p>
                  Over the next sixteen days the ground is expected to get {formatRain(water.rainMm, units.rain)} of
                  rain and lose {formatRain(water.et0Mm, units.rain)} to sun and wind. A negative number means the soil
                  is drying out even though it rains.
                </p>
              }
            >
              <span className={`stat-value${water.netMm < 0 ? ' bad' : ' good'}`}>
                {water.netMm > 0 ? '+' : ''}
                {formatRain(water.netMm, units.rain)}
              </span>
              <span className="stat-label">
                <Droplets size={15} aria-hidden />
                rain minus what the sun takes
              </span>
            </Explain>
          </div>
        )}

        <div className="stat">
          <Explain
            title="Days to harvest"
            term={
              <p>
                {crop.name} usually takes {crop.maturityRange[0]}–{crop.maturityRange[1]} days from sowing depending on
                the variety; Kurima counts from {crop.daysToMaturity}. This is a calendar estimate only — it does not
                yet account for how the season actually goes.
              </p>
            }
          >
            <span className="stat-value">{Math.max(0, toHarvest)}</span>
            <span className="stat-label">
              <CalendarCheck size={15} aria-hidden />
              days to harvest, about
            </span>
          </Explain>
        </div>
      </div>

      {atRisk && (
        <div className="cautions marginal">
          <p className="caution-head">
            <AlertTriangle size={15} aria-hidden />
            A dry spell is coming while the crop is still fragile
          </p>
          <ul>
            <li>
              The forecast shows {drySpell} dry {plural(drySpell, 'day')} in a row, and your {crop.name.toLowerCase()}{' '}
              is only {age} {plural(age, 'day')} old. Seedlings this young can be lost to a stretch like that.
            </li>
            <li>Kurima cannot tell you whether to replant — it does not know what is in your field. Your extension officer can.</li>
          </ul>
        </div>
      )}

      {children}
    </section>
  )
}
