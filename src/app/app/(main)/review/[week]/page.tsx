import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { getClock, getObjectives, getReviews } from "@/lib/data";
import { latestConfidence } from "@/lib/okr";
import { isWeekId, quarterOfWeek, shiftWeek, weekNumber, weekRange } from "@/lib/week";

type Props = { params: Promise<{ week: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params;
  return { title: isWeekId(week) ? `Review · Week ${weekNumber(week)}` : "Review" };
}

export default async function ReviewPage({ params }: Props) {
  const { week } = await params;
  if (!isWeekId(week)) notFound();
  const clock = await getClock();
  if (week > clock.currentWeek) notFound();

  const quarter = quarterOfWeek(week);
  const [objectives, reviews] = await Promise.all([getObjectives(quarter.key), getReviews(120)]);
  const review = reviews.find((r) => r.week === week) ?? null;
  const prev = reviews.find((r) => r.week === shiftWeek(week, -1)) ?? null;
  const priorConfidence: Record<string, number | null> = {};
  for (const o of objectives) priorConfidence[o.id] = latestConfidence(reviews, o.id, week)?.value ?? null;
  const nextWeek = shiftWeek(week, 1);

  return (
    <>
      <div className="review-coach-intro">
        <div>
          <div className="eyebrow">Weekly reflection</div>
          <strong>Evidence → bottleneck → next practice.</strong>
        </div>
        <p>For the reflection fields, focus the field and tap <b>Speak</b>. Dictate naturally instead of typing.</p>
      </div>
      <ReviewForm
        key={week}
        week={week}
        weekNumber={weekNumber(week)}
        range={weekRange(week)}
        quarterEnd={quarter.end}
        prevWeek={shiftWeek(week, -1)}
        nextWeek={nextWeek <= clock.currentWeek ? nextWeek : null}
        review={review}
        carriedFrom={prev?.next ?? []}
        objectives={objectives}
        priorConfidence={priorConfidence}
        sparringEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </>
  );
}
