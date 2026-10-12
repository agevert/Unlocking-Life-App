import type { KeyResult, Objective, Review } from "./schemas";
import type { WeekId } from "./week";

export type Status = "hit" | "on-pace" | "watch" | "behind";

export const STATUS_LABEL: Record<Status, string> = {
  hit: "Hit",
  "on-pace": "On pace",
  watch: "Watch",
  behind: "Behind",
};

/** Progress from start to target as 0–1. Works for metrics that should go down, too. */
export function krProgress(kr: Pick<KeyResult, "start" | "current" | "target">): number {
  const s = Number(kr.start) || 0;
  const t = Number(kr.target) || 0;
  const c = Number(kr.current) || 0;
  if (t === s) return c === t && t !== 0 ? 1 : 0;
  return Math.min(1, Math.max(0, (c - s) / (t - s)));
}

/** Compare progress with the share of the quarter that has elapsed. */
export function krStatus(progress: number, pace: number): Status {
  if (progress >= 1) return "hit";
  if (progress >= pace - 0.1) return "on-pace";
  if (progress >= pace - 0.25) return "watch";
  return "behind";
}

export function objectiveProgress(o: Pick<Objective, "key_results">): number {
  if (!o.key_results.length) return 0;
  return o.key_results.reduce((sum, k) => sum + krProgress(k), 0) / o.key_results.length;
}

/** Most recent confidence rating for an objective, optionally only from weeks before `before`. */
export function latestConfidence(
  reviews: Pick<Review, "week" | "confidence">[],
  objectiveId: string,
  before?: WeekId,
): { value: number; week: WeekId } | null {
  const sorted = [...reviews].sort((a, b) => b.week.localeCompare(a.week));
  for (const r of sorted) {
    if (before && r.week >= before) continue;
    const v = r.confidence?.[objectiveId];
    if (typeof v === "number") return { value: v, week: r.week };
  }
  return null;
}

export type LogStats = {
  followThrough: { done: number; total: number };
  linked: { linked: number; total: number };
  averageEnergy: number | null;
  reviewed: number;
};

export function logStats(reviews: Pick<Review, "carried" | "next" | "reflection" | "completed_at">[]): LogStats {
  let done = 0;
  let total = 0;
  let linked = 0;
  let nextTotal = 0;
  const energies: number[] = [];
  for (const r of reviews) {
    if (!r.completed_at) continue;
    for (const c of r.carried) {
      total++;
      if (c.done) done++;
    }
    for (const n of r.next) {
      nextTotal++;
      if (n.krId) linked++;
    }
    if (r.reflection?.energy) energies.push(r.reflection.energy);
  }
  return {
    followThrough: { done, total },
    linked: { linked, total: nextTotal },
    averageEnergy: energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : null,
    reviewed: reviews.filter((r) => r.completed_at).length,
  };
}

export function formatNumber(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "–";
  return v.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

export function percent(a: number, b: number): string {
  return b ? `${Math.round((a / b) * 100)}%` : "–";
}

export function newId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
