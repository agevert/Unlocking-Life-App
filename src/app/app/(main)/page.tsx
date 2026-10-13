import Link from "next/link";
import type { Metadata } from "next";
import { CoachHero } from "@/components/CoachHero";
import { CommitmentList } from "@/components/CommitmentList";
import { ObjectiveCard } from "@/components/ObjectiveCard";
import { getClock, getObjectives, getProfile, getReviews } from "@/lib/data";
import { latestConfidence } from "@/lib/okr";
import { quarterLabel, shiftWeek, weekNumber, weekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Today" };

export default async function NowPage() {
  const [profile, clock] = await Promise.all([getProfile(), getClock()]);
  const [objectives, reviews] = await Promise.all([getObjectives(clock.quarter.key), getReviews(60)]);
  const commitWeek = shiftWeek(clock.currentWeek, -1);
  const commitReview = reviews.find((r) => r.week === commitWeek);
  const pending = reviews.find((r) => r.week === clock.reviewWeek);
  const firstName = profile.display_name.split(" ")[0];
  const openCommitment = commitReview?.next.find((c) => !c.done && c.text.trim());
  const latestCompleted = reviews.find((r) => Boolean(r.completed_at));
  const unfinishedLastWeek = latestCompleted?.carried.filter((c) => !c.done).length ?? 0;
  const unlinkedNext = latestCompleted?.next.filter((c) => c.text.trim() && !c.krId).length ?? 0;

  const coach = !pending?.completed_at
    ? {
        eyebrow: `Week ${weekNumber(clock.reviewWeek)} review`,
        title: "Turn last week into a better decision.",
        body: "Review the evidence, name what actually changed, and let the next week attack the bottleneck instead of adding more activity.",
        href: `/app/review/${clock.reviewWeek}`,
        cta: pending ? "Continue weekly review" : "Run weekly review",
        bottleneck: unfinishedLastWeek
          ? `${unfinishedLastWeek} commitment${unfinishedLastWeek === 1 ? "" : "s"} from the prior week did not get finished.`
          : unlinkedNext
            ? `${unlinkedNext} next-week commitment${unlinkedNext === 1 ? " is" : "s are"} not tied to a key result.`
            : null,
      }
    : openCommitment
      ? {
          eyebrow: "Today",
          title: "Do the highest-leverage commitment before adding anything else.",
          body: openCommitment.text,
          href: "/app",
          cta: "Keep this as today’s focus",
          bottleneck: latestCompleted?.sparring ? "Your last coach challenge is the best clue to what deserves attention next." : null,
        }
      : objectives.length
        ? {
            eyebrow: "Today",
            title: "Create evidence, not activity.",
            body: "Pick one action that could change a key result or teach you something important about the plan. If it does neither, it is probably not the priority.",
            href: "/app/objectives",
            cta: "Review active goals",
            bottleneck: "There is no unfinished weekly commitment, so choose the next move from the objective that is least convincing today.",
          }
        : {
            eyebrow: "Start here",
            title: "Define what you want to become capable of.",
            body: "Start with one meaningful outcome, then choose evidence that would prove to a sceptic that you are actually progressing.",
            href: "/app/objectives",
            cta: "Create first goal",
            bottleneck: null,
          };

  return (
    <>
      <div className="today-heading">
        <div className="eyebrow">Life OS</div>
        <h1>{firstName ? `Good morning, ${firstName}.` : "Good morning."}</h1>
        <p className="muted">Build capability, not just streaks.</p>
      </div>

      <CoachHero {...coach} />

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
          <div className="empty stack">
            <p>No commitments yet. Your weekly review should produce at most three moves that deserve space in the coming week.</p>
            <div><Link className="btn" href={`/app/review/${clock.reviewWeek}`}>Build the week</Link></div>
          </div>
        )}
      </section>

      <section className="stack">
        <div className="spread">
          <h2>Active goals</h2>
          <span className="mono muted" style={{ fontSize: "0.8rem" }}>{quarterLabel(clock.quarter.key)}</span>
        </div>
        {objectives.length ? (
          objectives.map((o) => (
            <ObjectiveCard key={o.id} objective={o} pace={clock.pace} confidence={latestConfidence(reviews, o.id)?.value ?? null} />
          ))
        ) : (
          <div className="empty stack">
            <p>No goals for this quarter yet. Start with the one capability or outcome that would make the quarter meaningful on its own.</p>
            <div><Link className="btn primary" href="/app/objectives">Create a goal</Link></div>
          </div>
        )}
      </section>
    </>
  );
}
