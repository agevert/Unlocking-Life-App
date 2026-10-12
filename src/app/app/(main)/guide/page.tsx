import type { Metadata } from "next";

export const metadata: Metadata = { title: "How to use" };

export default function GuidePage() {
  return (
    <>
      <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
        <div className="eyebrow">How to use</div>
        <h1>One quarter, three objectives, thirty minutes a week</h1>
        <p className="lede">The app is the cheap part. The ritual is the product. Here&apos;s how to run it.</p>
      </div>

      <section className="stack">
        <h2>The rhythm</h2>
        <div className="rhythm">
          <div className="card stack" style={{ "--gap": "6px" } as React.CSSProperties}>
            <span className="eyebrow">Every quarter · 60 min</span>
            <h3>Set the bets</h3>
            <p className="muted">Up to three objectives in Objectives, each with two to four key results. Kill what didn&apos;t earn its place before adding anything new.</p>
          </div>
          <div className="card stack" style={{ "--gap": "6px" } as React.CSSProperties}>
            <span className="eyebrow">Every week · 30 min</span>
            <h3>Run the review</h3>
            <p className="muted">Four steps on your review day, then Spar with me. Block the slot in your calendar and treat it like a board meeting.</p>
          </div>
          <div className="card stack" style={{ "--gap": "6px" } as React.CSSProperties}>
            <span className="eyebrow">Every morning · 2 min</span>
            <h3>Check the three</h3>
            <p className="muted">Open Now. Which commitment does today move? If none, decide that on purpose.</p>
          </div>
        </div>
      </section>

      <section className="stack">
        <h2>Your first session</h2>
        <ol className="howto">
          <li><strong>Write your objectives.</strong> Set Start, Now and Target for each key result. Everything saves as you type.</li>
          <li><strong>Open the review.</strong> It opens on the most recent finished week: Monday to Thursday that&apos;s last week, Friday to Sunday it&apos;s this week.</li>
          <li><strong>Go through the four steps.</strong> In week one, step 1 is empty because there are no commitments yet.</li>
          <li><strong>Complete, then spar.</strong> Press Complete review (or Ctrl/⌘ + Enter), then Spar with me. Answer the hardest question in one line.</li>
          <li><strong>Install it on your phone.</strong> In Safari: Share → Add to Home Screen. In Chrome: menu → Install app.</li>
        </ol>
      </section>

      <section className="stack">
        <h2>The weekly review, step by step</h2>
        <dl className="dl">
          <dt>1 · Did you do what you said?</dt>
          <dd>Tick only what is done, not &ldquo;nearly&rdquo;. This becomes your follow-through rate in Log, the most honest number in the app.</dd>
          <dt>2 · Update the numbers</dt>
          <dd>Current value per key result, then confidence out of 10 that you&apos;ll hit each objective by quarter-end. Judge fresh every week; last week&apos;s rating is shown only for comparison.</dd>
          <dt>3 · Reflect</dt>
          <dd>What moved a number. What you avoided and the real reason. What you&apos;d tell a founder in your shoes. Energy from 1 to 5.</dd>
          <dt>4 · Commit to next week</dt>
          <dd>At most three, each linked to a key result and phrased as an outcome you can check on Friday.</dd>
        </dl>
      </section>

      <section className="stack">
        <h2>Reading the screen</h2>
        <dl className="dl">
          <dt>Quarter strip</dt>
          <dd>One cell per ISO week. Filled means reviewed, striped means a draft, grey means missed, outlined is this week. Tap a cell to open that week.</dd>
          <dt>Dark tick on a bar</dt>
          <dd>Where you would be today if progress were linear. Being behind it early is normal for outcomes that land late.</dd>
          <dt>Status</dt>
          <dd>
            <span className="chip on-pace">On pace</span> at or near the tick · <span className="chip watch">Watch</span> 10–25 points behind ·{" "}
            <span className="chip behind">Behind</span> more than 25 · <span className="chip hit">Hit</span> target reached
          </dd>
          <dt>Confidence</dt>
          <dd>Your latest rating. Two drops in a row means re-plan the objective, not try harder at the same plan.</dd>
        </dl>
      </section>

      <section className="stack">
        <h2>Strong vs weak</h2>
        <div className="tablewrap">
          <table className="cmp">
            <thead><tr><th scope="col"></th><th scope="col">Weak</th><th scope="col">Strong</th></tr></thead>
            <tbody>
              <tr><td>Objective</td><td>Get better at sales</td><td>Make the new region profitable before year-end</td></tr>
              <tr><td>Key result</td><td>Do more outreach</td><td>First meetings with qualified buyers: 0 → 15</td></tr>
              <tr><td>Commitment</td><td>Work on the strategy memo</td><td>Strategy memo v1 sent to two people for critique by Friday</td></tr>
              <tr><td>Avoided</td><td>Was busy</td><td>Didn&apos;t book the pricing call because I&apos;m unsure what to ask for</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack">
        <h2>House rules</h2>
        <ul className="howto" style={{ listStyle: "disc" }}>
          <li>Three objectives, four key results each, three commitments a week. The caps are the point.</li>
          <li>Prefer <b>outcome</b> key results. Add one <b>input</b> key result when the outcome depends on others.</li>
          <li>Never skip the review. Five honest minutes beat none, and a skipped week shows as a grey gap.</li>
          <li>Don&apos;t backfill old weeks from memory. One true line is enough.</li>
        </ul>
      </section>
    </>
  );
}
