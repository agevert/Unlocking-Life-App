import Link from "next/link";
import type { Metadata } from "next";
import { AspirationStrip } from "@/components/AspirationStrip";
import { CoachHero } from "@/components/CoachHero";
import { CommitmentList } from "@/components/CommitmentList";
import { ObjectiveCard } from "@/components/ObjectiveCard";
import { getAspiration, getClock, getObjectives, getProfile, getReviews } from "@/lib/data";
import { latestConfidence } from "@/lib/okr";
import { foundationLabel } from "@/lib/schemas";
import { quarterLabel, shiftWeek, weekNumber, weekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
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
  const openCommitment = commitReview?.next.find((c) => !c.done && c.text.trim());
  const latestCompleted = reviews.find((r) => Boolean(r.completed_at));
  const unfinishedLastWeek = latestCompleted?.carried.filter((c) => !c.done).length ?? 0;
  const unlinkedNext = latestCompleted?.next.filter((c) => c.text.trim() && !c.krId).length ?? 0;

  const coach = !pending?.completed_at
    ? {
        eyebrow: `Week ${weekNumber(clock.reviewWeek)} review`,
        title: "Turn last week into a better decision.",
        body: "Review the evidence, name what actually changed, and make the next week attack the bottleneck instead of adding more activity.",
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
          href: "/app/log#check-in",
          cta: "Create evidence from it",
          bottleneck: latestCompleted?.sparring ? "Your last coach challenge is the best clue to what deserves attention next." : null,
        }
      : objectives.length
        ? {
            eyebrow: "Today",
            title: "Create evidence, not activity.",
            body: "Choose one practice, experiment or real-world action that could change a key result or teach you something important about the plan.",
            href: "/app/log#check-in",
            cta: "Log deliberate practice",
            bottleneck: "There is no unfinished weekly commitment, so choose the least convincing goal and create evidence there.",
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
        <div className="eyebrow">Today</div>
        <h1>{firstName ? `Good morning, ${firstName}.` : "Good morning."}</h1>
        <p className="muted">Build capability. Leave evidence. Adjust the plan.</p>
      </div>

      <CoachHero {...coach} />

      <AspirationStrip aspiration={aspiration} objectives={objectives} quietWhenEmpty />

      <div className="v2-two-col">
        <section className="stack v2-panel">
          <div className="spread">
            <div>
              <div className="eyebrow">This week</div>
              <h2>Highest-leverage moves</h2>
            </div>
            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
              W{weekNumber(clock.currentWeek)} · {weekRange(clock.currentWeek)}
            </span>
          </div>
          {commitReview?.next.length ? (
            <CommitmentList week={commitWeek} items={commitReview.next} objectives={objectives} />
          ) : (
            <div className="empty stack">
              <p>No commitments yet. The weekly review should produce at most three moves that deserve space in the coming week.</p>
              <div><Link className="btn" href={`/app/review/${clock.reviewWeek}`}>Build the week</Link></div>
            </div>
          )}
        </section>

        <section className="stack v2-panel">
          <div className="spread">
            <div>
              <div className="eyebrow">Active goals</div>
              <h2>{quarterLabel(clock.quarter.key)}</h2>
            </div>
            <Link href="/app/objectives" className="btn small ghost">Edit goals</Link>
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
              <p>No goals for this quarter yet. Start with the capability or outcome that would make the quarter meaningful on its own.</p>
              <div><Link className="btn primary" href="/app/objectives">Create a goal</Link></div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
