import type { Metadata } from "next";
import { AspirationEditor } from "@/components/AspirationEditor";
import { getAspiration, getClock, getObjectives } from "@/lib/data";
import { quarterLabel } from "@/lib/week";

export const metadata: Metadata = { title: "Aspiration" };

export default async function AspirationPage() {
  const clock = await getClock();
  const [aspiration, objectives] = await Promise.all([getAspiration(), getObjectives(clock.quarter.key)]);
  const coverage: Record<string, string> = {};
  for (const o of objectives) if (o.foundation) coverage[o.foundation] = o.title || "Untitled objective";

  return (
    <>
      <div>
        <div className="eyebrow">Aspiration</div>
        <h1>The layer above the quarter</h1>
      </div>
      <p className="muted" style={{ maxWidth: "68ch" }}>
        <strong style={{ color: "var(--ink)" }}>Quarters are steps; this is where they lead.</strong> Write the vision once,
        name up to three foundations it rests on, and list the decisions you still owe yourself. Each quarter&apos;s
        objectives then map onto the foundations, and the sparring partner holds your weeks against all of it.
      </p>
      <AspirationEditor
        initial={aspiration}
        coverage={coverage}
        quarterLabel={quarterLabel(clock.quarter.key)}
        suggestedYear={Number(clock.today.slice(0, 4)) + 10}
      />
    </>
  );
}
