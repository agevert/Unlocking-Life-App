import type { Metadata } from "next";
import { AspirationEditor } from "@/components/AspirationEditor";
import { getAspiration, getClock, getObjectives } from "@/lib/data";
import { quarterLabel } from "@/lib/week";

export const metadata: Metadata = { title: "Vision" };

export default async function VisionPage() {
  const clock = await getClock();
  const [aspiration, objectives] = await Promise.all([getAspiration(), getObjectives(clock.quarter.key)]);
  const coverage: Record<string, string> = {};
  for (const o of objectives) if (o.foundation) coverage[o.foundation] = o.title || "Untitled goal";

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">Vision</div>
        <h1>Know what the quarters are for.</h1>
        <p className="lede">Your aspiration is the layer above goals: a long horizon, a few foundations, and the strategic questions you still need reality to answer.</p>
      </div>
      <div className="coach-check">
        <span className="eyebrow">Coach rule</span>
        <strong>Keep it useful, not poetic. If the vision cannot change what you do this quarter, it is too vague.</strong>
      </div>
      <AspirationEditor
        initial={aspiration}
        coverage={coverage}
        quarterLabel={quarterLabel(clock.quarter.key)}
        suggestedYear={Number(clock.today.slice(0, 4)) + 10}
      />
    </>
  );
}
