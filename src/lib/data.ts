import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import {
  commitmentSchema,
  keyResultSchema,
  reflectionSchema,
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

/** For pages under /app: returns the user or sends them to sign in. */
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

/** "Now", seen from the user's own time zone. */
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
  created_at: string;
  updated_at: string;
};

export function parseObjective(row: ObjectiveRow): Objective {
  const krs = Array.isArray(row.key_results) ? row.key_results : [];
  return {
    id: row.id,
    quarter: row.quarter,
    position: row.position,
    title: row.title ?? "",
    why: row.why ?? "",
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
    .select("id, quarter, position, title, why, key_results, created_at, updated_at")
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
