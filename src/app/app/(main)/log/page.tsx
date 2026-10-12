import type { Metadata } from "next";
import Link from "next/link";
import { ConfidenceChart } from "@/components/ConfidenceChart";
import { getClock, getObjectives, getReviews } from "@/lib/data";
import { logStats, percent } from "@/lib/okr";
import { quarterWeeks, weekNumber, weekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const clock = await getClock();
  const [objectives, reviews] = await Promise.all([getObjectives(clock.quarter.key), getReviews(120)]);
  const weeks = quarterWeeks(clock.quarter);
  const elapsed = weeks.filter((w) => w < clock.currentWeek);
  const reviewedThisQuarter = elapsed.filter((w) => reviews.find((r) => r.week === w)?.completed_at).length;
  const stats = logStats(reviews.slice(0, 8));
  const anyConfidence = reviews.some((r) => Object.keys(r.confidence).length);

  return (
    <>
      <div>
        <div className="eyebrow">Log</div>
        <h1>How the quarter is really going</h1>
      </div>

      <div className="stats">
        <div className="stat"><b className="mono">{reviewedThisQuarter}/{elapsed.length}</b><span>Weeks reviewed this quarter</span></div>
        <div className="stat"><b className="mono">{percent(stats.followThrough.done, stats.followThrough.total)}</b><span>Follow-through, last 8 reviews{stats.followThrough.total ? ` (${stats.followThrough.done}/${stats.followThrough.total})` : ""}</span></div>
        <div className="stat"><b className="mono">{percent(stats.linked.linked, stats.linked.total)}</b><span>Commitments linked to a key result</span></div>
        <div className="stat"><b className="mono">{stats.averageEnergy ? stats.averageEnergy.toFixed(1) : "–"}</b><span>Average energy, out of 5</span></div>
      </div>

      <section className="stack">
        <div className="spread">
          <h2>Confidence by week</h2>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>1–10 · ISO weeks</span>
        </div>
        <div className="card chartbox">
          <ConfidenceChart weeks={weeks} currentWeek={clock.currentWeek} objectives={objectives} reviews={reviews} />
          {!anyConfidence ? (
            <p className="muted" style={{ fontSize: "0.86rem", marginTop: 6 }}>
              Your confidence ratings plot here after the first review. A line that drops two weeks in a row is the signal to
              re-plan, not to try harder.
            </p>
          ) : null}
          <div className="legend">
            {objectives.map((o, i) => (
              <span key={o.id}><i style={{ background: `var(--s${(i % 3) + 1})` }} />{o.title || "Untitled objective"}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="spread">
          <h2>Past reviews</h2>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>{reviews.length} saved</span>
        </div>
        {!reviews.length ? (
          <p className="empty">
            Every review lands here: what you committed to, what moved, what you avoided, and the challenge you got back.
          </p>
        ) : null}
        {reviews.map((r, i) => {
          const done = r.carried.filter((c) => c.done).length;
          const ratio = r.carried.length ? done / r.carried.length : 0;
          return (
            <details key={r.week} className="entry" open={i === 0}>
              <summary>
                <div>
                  <div className="eyebrow">{weekRange(r.week)}</div>
                  <strong style={{ fontFamily: "var(--display)", fontSize: "1.05rem" }}>Week {weekNumber(r.week)}</strong>
                  {!r.completed_at ? <span className="chip" style={{ marginLeft: 8 }}>Draft</span> : null}
                </div>
                <div className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                  {r.carried.length ? (
                    <span className={`chip ${ratio >= 0.67 ? "good" : ratio >= 0.34 ? "warn" : "bad"}`}>{done}/{r.carried.length} done</span>
                  ) : null}
                  {r.reflection.energy ? <span className="chip">Energy {r.reflection.energy}/5</span> : null}
                  {objectives.map((o, oi) =>
                    r.confidence[o.id] ? (
                      <span key={o.id} className="chip" style={{ color: `var(--s${(oi % 3) + 1})` }}>{r.confidence[o.id]}/10</span>
                    ) : null,
                  )}
                </div>
              </summary>
              <div className="entry-body">
                {r.reflection.moved ? <div><h4>Moved a key result</h4><p>{r.reflection.moved}</p></div> : null}
                {r.reflection.avoided ? <div><h4>Avoided</h4><p>{r.reflection.avoided}</p></div> : null}
                {r.reflection.lesson ? <div><h4>Advice to self</h4><p>{r.reflection.lesson}</p></div> : null}
                {r.next.length ? (
                  <div>
                    <h4>Committed for the following week</h4>
                    <p>{r.next.map((n) => `${n.done ? "✓" : "·"} ${n.text}`).join("\n")}</p>
                  </div>
                ) : null}
                {r.sparring ? <div><h4>Sparring</h4><p>{r.sparring}</p></div> : null}
                <div><Link className="btn small" href={`/app/review/${r.week}`}>Open this review</Link></div>
              </div>
            </details>
          );
        })}
      </section>
    </>
  );
}
