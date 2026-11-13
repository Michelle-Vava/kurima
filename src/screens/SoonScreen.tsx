import type { Section } from '../lib/tabs'

/**
 * A section that exists in the plan but not yet in the app.
 *
 * It says what it will do and which milestone builds it, rather than showing
 * a spinner or a shrug. An empty room with a sign on the door is more use
 * than a door that is not there.
 */
export function SoonScreen({ section }: { section: Section }) {
  return (
    <section className="card soon-card" data-testid="soon">
      <span className="eyebrow">Not built yet · Milestone {section.milestone}</span>
      <h2>{section.label}</h2>
      <p className="lead">{section.blurb}</p>
      <p className="fine">
        Nothing here is guessed at in the meantime. Kurima would rather show an empty section than
        advice it has not checked.
      </p>
    </section>
  )
}
