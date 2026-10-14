import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import {
  commitmentSchema,
  emptyAspiration,
  foundationSchema,
  keyResultSchema,
  reflectionSchema,
  type Aspiration,
  type EvidenceEntry,
  type Objective,
  type Profile,
  type Review,
} from "./schemas";
import { defaultReviewWeek, quarterOf, quarterPace, todayIn, weekIdOf, type QuarterKey, type WeekId } from "./week";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function requireUser() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");
  return { supabase, user };
}

export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, timezone, review_weekday, reminders_enabled, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: data?.email ?? user.email ?? null,
    display_name: data?.display_name ?? "",
    timezone: data?.timezone ?? "Europe/Berlin",
    review_weekday: data?.review_weekday ?? 4,
    reminders_enabled: data?.reminders_enabled ?? true,
    onboarded_at: data?.onboarded_at ?? null,
  };
});

export const getClock = cache(async () => {
  const profile = await getProfile();
  const today = todayIn(profile.timezone);
  const quarter = quarterOf(today);
  return {
    today,
    currentWeek: weekIdOf(today),
    reviewWeek: defaultReviewWeek(today),
    quarter,
    pace: quarterPace(today, quarter),
  };
});

type ObjectiveRow = {
  id: string;
  quarter: string;
  position: number;
  title: string;
  why: string;
  key_results: unknown;
  foundation?: unknown;
  bottleneck?: unknown;
  first_practice?: unknown;
  created_at: string;
  updated_at: string;
};

export const OBJECTIVE_COLUMNS = "id, quarter, position, title, why, key_results, foundation, bottleneck, first_practice, created_at, updated_at";

export function parseObjective(row: ObjectiveRow): Objective {
  const krs = Array.isArray(row.key_results) ? row.key_results : [];
  return {
    id: row.id,
    quarter: row.quarter,
    position: row.position,
    title: row.title ?? "",
    why: row.why ?? "",
    foundation: typeof row.foundation === "string" && row.foundation ? row.foundation : null,
    bottleneck: typeof row.bottleneck === "string" ? row.bottleneck : "",
    first_practice: typeof row.first_practice === "string" ? row.first_practice : "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    key_results: krs.flatMap((k) => {
      const p = keyResultSchema.safeParse(k);
      return p.success ? [p.data] : [];
    }),
  };
}

export async function getObjectives(quarter: QuarterKey): Promise<Objective[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("objectives")
    .select(OBJECTIVE_COLUMNS)
    .eq("quarter", quarter)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(parseObjective);
}

type ReviewRow = {
  week: string;
  carried: unknown;
  reflection: unknown;
  confidence: unknown;
  kr_values: unknown;
  next: unknown;
  sparring: string | null;
  completed_at: string | null;
  updated_at: string;
};

const commitments = (v: unknown) =>
  (Array.isArray(v) ? v : []).flatMap((c) => {
    const p = commitmentSchema.safeParse(c);
    return p.success ? [p.data] : [];
  });

const numberRecord = (v: unknown) => {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v)) if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  }
  return out;
};

export function parseReview(row: ReviewRow): Review {
  const reflection = reflectionSchema.safeParse(row.reflection ?? {});
  return {
    week: row.week,
    carried: commitments(row.carried),
    next: commitments(row.next),
    reflection: reflection.success ? reflection.data : { moved: "", avoided: "", lesson: "", energy: 0 },
    confidence: numberRecord(row.confidence),
    kr_values: numberRecord(row.kr_values),
    sparring: row.sparring,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  };
}

const REVIEW_COLUMNS = "week, carried, reflection, confidence, kr_values, next, sparring, completed_at, updated_at";

export async function getReviews(limit = 120): Promise<Review[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .order("week", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(parseReview);
}

export async function getReview(week: WeekId): Promise<Review | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("reviews").select(REVIEW_COLUMNS).eq("week", week).maybeSingle();
  if (error) throw error;
  return data ? parseReview(data) : null;
}

// ---------------------------------------------------------------- aspiration

type AspirationRow = {
  horizon_year?: unknown;
  vision?: unknown;
  foundations?: unknown;
  questions?: unknown;
  updated_at?: unknown;
};

export const ASPIRATION_COLUMNS = "horizon_year, vision, foundations, questions, updated_at";

export function parseAspiration(row: unknown): Aspiration {
  if (!row || typeof row !== "object" || Array.isArray(row)) return emptyAspiration();
  const r = row as AspirationRow;
  const year = typeof r.horizon_year === "number" && Number.isInteger(r.horizon_year) ? r.horizon_year : null;
  return {
    horizon_year: year,
    vision: typeof r.vision === "string" ? r.vision : "",
    foundations: (Array.isArray(r.foundations) ? r.foundations : []).flatMap((f) => {
      const p = foundationSchema.safeParse(f);
      return p.success ? [p.data] : [];
    }),
    questions: (Array.isArray(r.questions) ? r.questions : []).filter((q): q is string => typeof q === "string"),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : null,
  };
}

export const getAspiration = cache(async (): Promise<Aspiration> => {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("aspirations").select(ASPIRATION_COLUMNS).maybeSingle();
  if (error) {
    console.error("aspiration load failed", error);
    return emptyAspiration();
  }
  return parseAspiration(data);
});

// ---------------------------------------------------------------- evidence

type EvidenceRow = {
  id: string;
  objective_id: string | null;
  kr_id: string | null;
  kind: string;
  practice: string;
  evidence: string;
  difficulty: number;
  coach_feedback: string | null;
  next_practice: string | null;
  created_at: string;
  updated_at: string;
};

export const EVIDENCE_COLUMNS = "id, objective_id, kr_id, kind, practice, evidence, difficulty, coach_feedback, next_practice, created_at, updated_at";

export function parseEvidence(row: EvidenceRow): EvidenceEntry {
  const kind = row.kind === "experiment" || row.kind === "real_world" ? row.kind : "practice";
  return {
    id: row.id,
    objective_id: row.objective_id,
    kr_id: row.kr_id ?? "",
    kind,
    practice: row.practice ?? "",
    evidence: row.evidence ?? "",
    difficulty: Math.min(5, Math.max(1, Number(row.difficulty) || 1)),
    coach_feedback: row.coach_feedback,
    next_practice: row.next_practice,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getEvidence(limit = 50): Promise<EvidenceEntry[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("evidence_entries")
    .select(EVIDENCE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(parseEvidence);
}
