import Link from "next/link";
import { quarterWeeks, weekNumber, weekRange, type Quarter, type WeekId } from "@/lib/week";

export function QuarterStrip({
  quarter,
  currentWeek,
  status,
}: {
  quarter: Quarter;
  currentWeek: WeekId;
  status: Record<string, "done" | "draft">;
}) {
  const weeks = quarterWeeks(quarter);
  return (
    <div>
      <nav className="qstrip" aria-label="Weeks of the quarter">
        {weeks.map((w) => {
          const cls = ["qcell"];
          if (w < currentWeek) cls.push("past");
          if (w === currentWeek) cls.push("current");
          if (status[w]) cls.push(status[w]);
          const future = w > currentWeek;
          const label = `Week ${weekNumber(w)}, ${weekRange(w)}${status[w] === "done" ? ", reviewed" : status[w] === "draft" ? ", draft" : ""}`;
          return future ? (
            <div key={w} className={cls.join(" ")} title={label} aria-label={label}>
              <i />
              <span>{weekNumber(w)}</span>
            </div>
          ) : (
            <Link key={w} href={`/app/review/${w}`} className={cls.join(" ")} title={label} aria-label={label}>
              <i />
              <span>{weekNumber(w)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="qlegend" aria-hidden="true">
        <span><i style={{ background: "var(--accent)" }} />Reviewed</span>
        <span><i style={{ background: "repeating-linear-gradient(-45deg, var(--accent-soft) 0 3px, var(--line) 3px 6px)" }} />Draft</span>
        <span><i style={{ background: "var(--line)" }} />Missed</span>
        <span><i style={{ boxShadow: "inset 0 0 0 2px var(--accent)" }} />This week</span>
      </div>
    </div>
  );
}
