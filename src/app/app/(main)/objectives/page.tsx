import type { Metadata } from "next";
import Link from "next/link";
import { AspirationStrip } from "@/components/AspirationStrip";
import { ObjectivesEditor } from "@/components/ObjectivesEditor";
import { getAspiration, getClock, getObjectives } from "@/lib/data";
import { isQuarterKey, quarterLabel, shiftQuarter } from "@/lib/week";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const clock = await getClock();
  const { q } = await searchParams;
  const current = clock.quarter.key;
  const allowed = [shiftQuarter(current, -1), current, shiftQuarter(current, 1)];
  const quarter = q && isQuarterKey(q) && allowed.includes(q) ? q : current;
  const [objectives, aspiration] = await Promise.all([getObjectives(quarter), getAspiration()]);

  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">Goals</div>
        <h1>Build a capability. Prove it.</h1>
        <p className="lede">A strong quarterly goal says what changes in reality. Key results are the evidence, not a list of tasks.</p>
      </div>

      <AspirationStrip aspiration={aspiration} objectives={objectives} />

      <div className="spread">
        <div>
          <div className="eyebrow">Quarter</div>
          <h2>{quarterLabel(quarter)}</h2>
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

      <div className="coach-check goal-rule">
        <span className="eyebrow">Coach rule</span>
        <strong>Three goals maximum. Each key result should leave observable evidence that a sceptic would accept.</strong>
      </div>

      <ObjectivesEditor
        key={quarter}
        quarter={quarter}
        initial={objectives}
        foundations={aspiration.foundations}
        readOnly={quarter < current}
      />
    </>
  );
}
