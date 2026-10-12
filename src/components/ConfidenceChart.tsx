import type { Objective, Review } from "@/lib/schemas";
import { weekNumber, type WeekId } from "@/lib/week";

export function ConfidenceChart({
  weeks,
  currentWeek,
  objectives,
  reviews,
}: {
  weeks: WeekId[];
  currentWeek: WeekId;
  objectives: Objective[];
  reviews: Review[];
}) {
  const W = 640, H = 180, L = 30, R = 14, T = 14, B = 28;
  const cw = W - L - R, ch = H - T - B;
  const x = (i: number) => L + (weeks.length > 1 ? (i / (weeks.length - 1)) * cw : cw / 2);
  const y = (v: number) => T + (1 - (v - 1) / 9) * ch;
  const byWeek = new Map(reviews.map((r) => [r.week, r]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: "block" }} role="img" aria-label="Confidence per objective by week">
      {[1, 5, 10].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontFamily="var(--mono)" fontSize={10} fill="var(--muted)">{v}</text>
        </g>
      ))}
      {weeks.map((w, i) => (
        <text key={w} x={x(i)} y={H - 9} textAnchor="middle" fontFamily="var(--mono)" fontSize={10} fill={w === currentWeek ? "var(--ink)" : "var(--muted)"}>
          {weekNumber(w)}
        </text>
      ))}
      {objectives.map((o, oi) => {
        const color = `var(--s${(oi % 3) + 1})`;
        const pts = weeks.flatMap((w, i) => {
          const v = byWeek.get(w)?.confidence[o.id];
          return typeof v === "number" ? [[x(i), y(v)] as const] : [];
        });
        return (
          <g key={o.id}>
            {pts.length > 1 ? (
              <polyline fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" points={pts.map((p) => p.join(",")).join(" ")} />
            ) : null}
            {pts.map((p, j) => (
              <circle key={j} cx={p[0]} cy={p[1]} r={j === pts.length - 1 ? 4 : 2.6} fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
