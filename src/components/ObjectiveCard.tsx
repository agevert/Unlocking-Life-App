import type { Objective } from "@/lib/schemas";
import { KrRow } from "./KrBar";

export function ObjectiveCard({
  objective,
  pace,
  confidence,
  foundation = null,
}: {
  objective: Objective;
  pace: number;
  confidence: number | null;
  /** Name of the foundation this objective serves, if tagged. */
  foundation?: string | null;
}) {
  return (
    <article className="card obj">
      <div className="obj-head">
        <div>
          {foundation ? <span className="chip accent obj-foundation">{foundation}</span> : null}
          <h2>{objective.title || "Untitled objective"}</h2>
          {objective.why ? <p className="obj-why">{objective.why}</p> : null}
        </div>
        <div className="conf" aria-label={`Confidence ${confidence ?? "not rated"} out of 10`}>
          <b className="mono">{confidence ?? "–"}</b>
          <small>Confidence /10</small>
        </div>
      </div>
      {objective.key_results.length ? (
        objective.key_results.map((k) => <KrRow key={k.id} kr={k} pace={pace} />)
      ) : (
        <p className="muted">No key results yet.</p>
      )}
    </article>
  );
}
