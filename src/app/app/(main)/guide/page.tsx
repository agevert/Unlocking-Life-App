import type { Metadata } from "next";

export const metadata: Metadata = { title: "Method" };

export default function MethodPage() {
  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">Method</div>
        <h1>Activity is not progress.</h1>
        <p className="lede">Unlocking Life is a loop for turning intention into increased capability: choose, practice, produce evidence, reflect, then attack the next bottleneck.</p>
      </div>

      <section className="method-loop" aria-label="Unlocking Life loop">
        {[
          ["01", "Aspiration", "Know what the quarters are for."],
          ["02", "Goal", "Choose a meaningful capability or outcome for the quarter."],
          ["03", "Practice", "Do a deliberate rep or real-world experiment."],
          ["04", "Evidence", "Record what is observably different, not how hard you worked."],
          ["05", "Reflection", "Find the bottleneck and update the plan."],
        ].map(([n, title, body]) => (
          <div className="method-step" key={n}>
            <span className="mono">{n}</span>
            <div><h3>{title}</h3><p>{body}</p></div>
          </div>
        ))}
      </section>

      <section className="v2-two-col">
        <div className="card stack">
          <div className="eyebrow">Strong evidence</div>
          <h2>Something changed in reality.</h2>
          <p className="muted">A number moved, a decision got easier, a skill survived a harder constraint, a user behaved differently, or you can now produce an output you could not produce before.</p>
        </div>
        <div className="card stack">
          <div className="eyebrow">Weak evidence</div>
          <h2>You were busy.</h2>
          <p className="muted">Hours spent, pages read, meetings attended and tasks completed matter only when they create a capability signal or change an outcome.</p>
        </div>
      </section>

      <section className="stack">
        <h2>The rhythm</h2>
        <div className="rhythm">
          <div className="card stack"><span className="eyebrow">Long horizon</span><h3>Vision</h3><p className="muted">Set the destination and a few foundations. Revisit when reality changes, not every week.</p></div>
          <div className="card stack"><span className="eyebrow">Quarterly</span><h3>Goals</h3><p className="muted">Up to three goals. Key results must be measurable evidence.</p></div>
          <div className="card stack"><span className="eyebrow">Weekly</span><h3>Review</h3><p className="muted">What changed? What did you avoid? What is the bottleneck? What deserves next week?</p></div>
          <div className="card stack"><span className="eyebrow">Daily</span><h3>Evidence</h3><p className="muted">Capture deliberate practice in three minutes while the learning is fresh.</p></div>
        </div>
      </section>

      <section className="coach-check">
        <span className="eyebrow">Voice</span>
        <strong>Focus any text field and use the Speak control. Dictate in English, German or Spanish; the text is inserted directly into the active field.</strong>
      </section>
    </>
  );
}
