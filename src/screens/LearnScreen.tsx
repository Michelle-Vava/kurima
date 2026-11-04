import { LEARN } from '../lib/learn'

/** Plain explanations of the ideas behind the advice. */
export function LearnScreen() {
  return (
    <>
      <section className="card" data-testid="learn-intro">
        <h3>Understanding the season</h3>
        <p className="sub">
          Short explanations of the ideas Kurima uses to answer "should I plant?". No farming background assumed.
        </p>
      </section>
      {LEARN.map((e) => (
        <details key={e.id} className="card learn" data-testid={`learn-${e.id}`}>
          <summary>{e.question}</summary>
          <div className="disclosure">
            {e.body.map((p) => <p key={p}>{p}</p>)}
            {e.inApp && (
              <p className="in-app"><strong>In Kurima:</strong> {e.inApp}</p>
            )}
          </div>
        </details>
      ))}
      <p className="fine">
        Guidance only, and not a substitute for your national meteorological service or your extension officer.
      </p>
    </>
  )
}
