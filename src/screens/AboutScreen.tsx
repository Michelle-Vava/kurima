import { CloudRain, Eye, Lock, Sprout, Sun } from 'lucide-react'
import { PILOT_COUNTRY, PILOT_DISTRICTS } from '../lib/places'
import { SECTIONS } from '../lib/tabs'

/**
 * What Kurima is, in about thirty seconds.
 *
 * An earlier version of this page ran to five sections of prose and read, as
 * it was fairly described, like a novel. Nobody reads an About page; they
 * glance at it to decide whether to trust the thing. So: one sentence of
 * what, four icons of how, three lines of what it cannot do, and out.
 */
export function AboutScreen() {
  const soon = SECTIONS.filter((s) => s.status === 'soon')

  return (
    <div className="prose">
      <section className="card about-hero">
        <h2>Is this a good time to plant?</h2>
        <p className="lead">
          That is the whole question Kurima answers, for a farmer growing a crop on rain alone. <em>Kurima</em> means
          "farming" in Shona.
        </p>
      </section>

      <section className="card">
        <h3>What it checks</h3>
        <ul className="checks">
          <li>
            <CloudRain size={19} aria-hidden />
            <div>
              <strong>Enough rain to sprout</strong>
              <span>About 20 mm within 3 days wets the top of the soil.</span>
            </div>
          </li>
          <li>
            <Sun size={19} aria-hidden />
            <div>
              <strong>No dry spell coming</strong>
              <span>A week without rain kills a young seedling. The strongest check.</span>
            </div>
          </li>
          <li>
            <Sprout size={19} aria-hidden />
            <div>
              <strong>The ground actually wetting up</strong>
              <span>The sun pulls water back out daily. Kurima counts both ways.</span>
            </div>
          </li>
          <li>
            <Eye size={19} aria-hidden />
            <div>
              <strong>The right time of year here</strong>
              <span>Thirty years of records say when your rains usually break.</span>
            </div>
          </li>
        </ul>
      </section>

      <section className="card">
        <h3>What it cannot do</h3>
        <ul className="plain">
          <li>See your field — only a weather model for your district. You know your soil and your seed.</li>
          <li>Measure rain. There is no gauge near you; past days are a model's estimate, and labelled so.</li>
          <li>
            Promise it is right. The rule is still being checked against past seasons in {PILOT_DISTRICTS.length}{' '}
            {PILOT_COUNTRY} districts.
          </li>
        </ul>
        <p className="notice">
          <strong>Guidance only.</strong> Follow your national met service and your extension officer first.
        </p>
      </section>

      <section className="card">
        <h3><Lock size={17} aria-hidden /> Privacy</h3>
        <p>
          No account, no server, no location tracking. Your district and settings stay on this device.
        </p>
      </section>

      <section className="card">
        <h3>Coming later</h3>
        <p className="sub">{soon.map((s) => s.label).join(' · ')} — and more crops, countries and languages.</p>
      </section>
    </div>
  )
}
