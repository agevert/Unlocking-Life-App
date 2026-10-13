import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceCheckIn } from "@/components/EvidenceCheckIn";
import { getClock, getEvidence, getObjectives, getReviews } from "@/lib/data";
import { logStats, percent } from "@/lib/okr";
import { weekNumber, weekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Evidence" };

const kindLabel = (kind: string) => kind === "real_world" ? "Real-world test" : kind === "experiment" ? "Experiment" : "Practice";

export default async function EvidencePage() {
  const clock = await getClock();
  const [objectives, reviews, evidence] = await Promise.all([
    getObjectives(clock.quarter.key),
    getReviews(24),
    getEvidence(60),
  ]);
  const stats = logStats(reviews.slice(0, 8));
  const krNames = new Map<string, string>();
  const objectiveNames = new Map<string, string>();
  for (const o of objectives) {
    objectiveNames.set(o.id, o.title || "Untitled goal");
    for (const k of o.key_results) krNames.set(k.id, k.title || "Untitled key result");
  }

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">Evidence</div>
        <h1>Improvement needs receipts.</h1>
        <p className="lede">Capture a deliberate rep while it is fresh. The coach turns it into a capability signal and the next practice.</p>
      </div>

      <EvidenceCheckIn objectives={objectives} />

      <section className="stack">
        <div className="spread">
          <div>
            <div className="eyebrow">Recent evidence</div>
            <h2>What changed in reality</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>{evidence.length} saved</span>
        </div>
        {!evidence.length ? (
          <div className="empty">Your deliberate practice, experiments and real-world tests will build a record here.</div>
        ) : (
          <div className="evidence-feed">
            {evidence.map((entry) => (
              <article key={entry.id} className="evidence-entry">
                <div className="evidence-entry-head">
                  <span className="chip accent">{kindLabel(entry.kind)}</span>
                  <time className="mono muted" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time>
                </div>
                <h3>{entry.practice}</h3>
                <p>{entry.evidence}</p>
                <div className="evidence-meta">
                  {entry.objective_id && objectiveNames.get(entry.objective_id) ? <span>{objectiveNames.get(entry.objective_id)}</span> : null}
                  {entry.kr_id && krNames.get(entry.kr_id) ? <span>→ {krNames.get(entry.kr_id)}</span> : null}
                  <span>Difficulty {entry.difficulty}/5</span>
                </div>
                {entry.coach_feedback ? (
                  <div className="evidence-coach-note">
                    <span className="eyebrow">Coach</span>
                    <p>{entry.coach_feedback}</p>
                    {entry.next_practice ? <strong>Next: {entry.next_practice}</strong> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="v2-metrics" aria-label="Weekly signals">
        <div><b className="mono">{percent(stats.followThrough.done, stats.followThrough.total)}</b><span>Follow-through · last 8 reviews</span></div>
        <div><b className="mono">{percent(stats.linked.linked, stats.linked.total)}</b><span>Commitments linked to a KR</span></div>
        <div><b className="mono">{stats.averageEnergy ? stats.averageEnergy.toFixed(1) : "–"}</b><span>Average energy /5</span></div>
      </section>

      <section className="stack">
        <div className="spread">
          <div>
            <div className="eyebrow">Weekly reflection</div>
            <h2>What the weeks taught you</h2>
          </div>
          <Link className="btn small" href="/app/review">Open review</Link>
        </div>
        {reviews.slice(0, 8).map((r, i) => (
          <details key={r.week} className="entry" open={i === 0}>
            <summary>
              <div>
                <div className="eyebrow">{weekRange(r.week)}</div>
                <strong style={{ fontFamily: "var(--display)", fontSize: "1.05rem" }}>Week {weekNumber(r.week)}</strong>
              </div>
              <span className={`chip ${r.completed_at ? "good" : ""}`}>{r.completed_at ? "Reviewed" : "Draft"}</span>
            </summary>
            <div className="entry-body">
              {r.reflection.moved ? <div><h4>Evidence of movement</h4><p>{r.reflection.moved}</p></div> : null}
              {r.reflection.avoided ? <div><h4>Avoided</h4><p>{r.reflection.avoided}</p></div> : null}
              {r.reflection.lesson ? <div><h4>Lesson</h4><p>{r.reflection.lesson}</p></div> : null}
              {r.sparring ? <div><h4>Coach</h4><p>{r.sparring}</p></div> : null}
            </div>
          </details>
        ))}
      </section>
    </>
  );
}
