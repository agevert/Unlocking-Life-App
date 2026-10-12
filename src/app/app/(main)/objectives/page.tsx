import type { Metadata } from "next";
import Link from "next/link";
import { ObjectivesEditor } from "@/components/ObjectivesEditor";
import { getClock, getObjectives } from "@/lib/data";
import { isQuarterKey, quarterLabel, shiftQuarter } from "@/lib/week";

export const metadata: Metadata = { title: "Objectives" };

export default async function ObjectivesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const clock = await getClock();
  const { q } = await searchParams;
  const current = clock.quarter.key;
  const allowed = [shiftQuarter(current, -1), current, shiftQuarter(current, 1)];
  const quarter = q && isQuarterKey(q) && allowed.includes(q) ? q : current;
  const objectives = await getObjectives(quarter);

  return (
    <>
      <div className="spread">
        <div>
          <div className="eyebrow">Objectives</div>
          <h1>{quarterLabel(quarter)}</h1>
        </div>
        <nav className="row" aria-label="Quarter">
          {allowed.map((k) => (
            <Link
              key={k}
              href={k === current ? "/app/objectives" : `/app/objectives?q=${k}`}
              className={`btn small${k === quarter ? " primary" : ""}`}
              aria-current={k === quarter ? "page" : undefined}
            >
              {k === current ? "This quarter" : k < current ? "Last quarter" : "Next quarter"}
            </Link>
          ))}
        </nav>
      </div>
      <p className="muted" style={{ maxWidth: "68ch" }}>
        <strong style={{ color: "var(--ink)" }}>Three objectives at most.</strong> An objective is a direction worth a quarter;
        key results are the evidence you got there. Write outcomes you could prove to a sceptic, not tasks. Add one input key
        result when the outcome depends on other people. Changes save automatically.
      </p>
      <ObjectivesEditor key={quarter} quarter={quarter} initial={objectives} readOnly={quarter < current} />
    </>
  );
}
