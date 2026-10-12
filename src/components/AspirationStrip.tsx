import Link from "next/link";
import { hasAspiration, type Aspiration, type Objective } from "@/lib/schemas";

/**
 * The long-term layer in one glance, shown above the quarter: the vision and whether each
 * foundation has an objective this quarter. With no aspiration yet it invites one, unless `quietWhenEmpty`.
 */
export function AspirationStrip({
  aspiration,
  objectives,
  quietWhenEmpty = false,
}: {
  aspiration: Aspiration;
  objectives: Objective[];
  quietWhenEmpty?: boolean;
}) {
  if (!hasAspiration(aspiration)) {
    if (quietWhenEmpty) return null;
    return (
      <div className="asp-strip empty-strip">
        <div>
          <div className="eyebrow">Aspiration</div>
          <p>The quarter is a step toward something. Write down what, and the three foundations it rests on.</p>
        </div>
        <Link className="btn primary" href="/app/aspiration">Write it</Link>
      </div>
    );
  }

  const covered = new Set(objectives.map((o) => o.foundation).filter(Boolean));
  return (
    <section className="asp-strip" aria-label="Aspiration">
      <div className="spread">
        <div className="eyebrow">Aspiration{aspiration.horizon_year ? ` · ${aspiration.horizon_year}` : ""}</div>
        <Link href="/app/aspiration" className="asp-edit">Edit</Link>
      </div>
      {aspiration.vision.trim() ? <p className="asp-vision">{aspiration.vision}</p> : null}
      {aspiration.foundations.length ? (
        <ul className="asp-chips" aria-label="Foundations this quarter">
          {aspiration.foundations.map((f, i) => {
            const has = covered.has(f.id);
            return (
              <li key={f.id} className={`chip ${has ? "good" : "watch"}`}>
                <span aria-hidden="true">{has ? "●" : "○"}</span>
                {f.name.trim() || `Foundation ${i + 1}`}
                <span className="sr-only">{has ? ", has an objective this quarter" : ", no objective this quarter"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
