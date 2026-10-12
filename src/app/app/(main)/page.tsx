import Link from "next/link";
import type { Metadata } from "next";
import { AspirationStrip } from "@/components/AspirationStrip";
import { CommitmentList } from "@/components/CommitmentList";
import { ObjectiveCard } from "@/components/ObjectiveCard";
import { getAspiration, getClock, getObjectives, getProfile, getReviews } from "@/lib/data";
import { latestConfidence } from "@/lib/okr";
import { foundationLabel } from "@/lib/schemas";
import { quarterLabel, shiftWeek, weekNumber, weekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Now" };

export default async function NowPage() {
  const [profile, clock] = await Promise.all([getProfile(), getClock()]);
  const [objectives, reviews, aspiration] = await Promise.all([
    getObjectives(clock.quarter.key),
    getReviews(60),
    getAspiration(),
  ]);
  const commitWeek = shiftWeek(clock.currentWeek, -1);
  const commitReview = reviews.find((r) => r.week === commitWeek);
  const pending = reviews.find((r) => r.week === clock.reviewWeek);
  const firstName = profile.display_name.split(" ")[0];

  return (
    <>
      {!pending?.completed_at ? (
        <div className="callout appear">
          <div>
            <div className="eyebrow">{pending ? "Review in progress" : "Review open"}</div>
            <p style={{ fontWeight: 500, marginTop: 2 }}>
              {firstName ? `${firstName}, week` : "Week"} {weekNumber(clock.reviewWeek)} ({weekRange(clock.reviewWeek)}){" "}
              {pending ? "has a draft waiting." : "hasn't been reviewed yet."}
            </p>
          </div>
          <Link className="btn primary" href={`/app/review/${clock.reviewWeek}`}>
            {pending ? "Continue review" : "Start review"}
          </Link>
        </div>
      ) : null}

      <section className="stack">
        <div className="spread">
          <h2>This week&apos;s commitments</h2>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>
            Week {weekNumber(clock.currentWeek)} · {weekRange(clock.currentWeek)}
          </span>
        </div>
        {commitReview?.next.length ? (
          <CommitmentList week={commitWeek} items={commitReview.next} objectives={objectives} />
        ) : (
          <p className="empty">
            No commitments for this week yet. You set them in step 4 of the weekly review, and they appear here to tick
            off as you go.
          </p>
        )}
      </section>

      <section className="stack">
        <AspirationStrip aspiration={aspiration} objectives={objectives} quietWhenEmpty />
        <div className="spread">
          <h2>{quarterLabel(clock.quarter.key)} objectives</h2>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>Dark tick = where linear progress would be today</span>
        </div>
        {objectives.length ? (
          objectives.map((o) => (
            <ObjectiveCard
              key={o.id}
              objective={o}
              pace={clock.pace}
              confidence={latestConfidence(reviews, o.id)?.value ?? null}
              foundation={foundationLabel(aspiration, o.foundation)}
            />
          ))
        ) : (
          <div className="empty stack">
            <p>No objectives for this quarter yet. Start with the one that would make the quarter a success on its own.</p>
            <div><Link className="btn primary" href="/app/objectives">Set objectives</Link></div>
          </div>
        )}
      </section>
    </>
  );
}
