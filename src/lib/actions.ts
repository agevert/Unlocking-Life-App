"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LIMITS } from "./config";
import {
  ASPIRATION_COLUMNS,
  EVIDENCE_COLUMNS,
  OBJECTIVE_COLUMNS,
  getSession,
  parseAspiration,
  parseEvidence,
  parseObjective,
  parseReview,
} from "./data";
import { newId } from "./okr";
import {
  aspirationInputSchema,
  evidenceInputSchema,
  foundationSchema,
  objectiveInputSchema,
  profileInputSchema,
  reviewInputSchema,
  type AspirationInput,
  type EvidenceEntry,
  type EvidenceInput,
  type Objective,
  type ObjectiveInput,
  type ProfileInput,
  type ReviewInput,
} from "./schemas";
import { createAdminClient } from "./supabase/admin";
import { isQuarterKey, isWeekId, quarterOfWeek, shiftWeek } from "./week";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function authed() {
  const { supabase, user } = await getSession();
  if (!user) throw new Error("Your session has ended. Sign in again.");
  return { supabase, user };
}

function message(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message || "Some fields are invalid. Check the values and try again.";
  if (e instanceof Error) return e.message;
  return "Something went wrong. Try again.";
}

// ---------------------------------------------------------------- reviews

export async function saveReview(
  week: string,
  raw: ReviewInput,
  complete: boolean,
): Promise<ActionResult<{ savedAt: string; completedAt: string | null }>> {
  try {
    if (!isWeekId(week)) return fail("That week doesn't exist.");
    const input = reviewInputSchema.parse(raw);
    input.next = input.next.filter((n) => n.text.trim()).map((n) => ({ ...n, text: n.text.trim() }));
    const { supabase, user } = await authed();

    const row: Record<string, unknown> = { user_id: user.id, week, ...input };
    if (complete) row.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("reviews")
      .upsert(row, { onConflict: "user_id,week" })
      .select("updated_at, completed_at")
      .single();
    if (error) throw error;

    if (complete) {
      await applyCompletion(week, input);
      revalidatePath("/app", "layout");
    }
    return ok({ savedAt: data.updated_at as string, completedAt: (data.completed_at as string) ?? null });
  } catch (e) {
    return fail(message(e));
  }
}

async function applyCompletion(week: string, input: ReviewInput) {
  const { supabase } = await authed();
  const prevWeek = shiftWeek(week, -1);
  const { data: prev } = await supabase.from("reviews").select("week, next").eq("week", prevWeek).maybeSingle();
  if (prev && Array.isArray(prev.next) && input.carried.length) {
    const next = (prev.next as { text: string; krId?: string; done?: boolean }[]).map((n, i) => ({
      ...n,
      done: input.carried[i]?.text === n.text ? input.carried[i].done : !!n.done,
    }));
    await supabase.from("reviews").update({ next }).eq("week", prevWeek);
  }

  const { data: later } = await supabase
    .from("reviews")
    .select("week")
    .gt("week", week)
    .not("completed_at", "is", null)
    .limit(1);
  if (later && later.length) return;

  const quarter = quarterOfWeek(week).key;
  const { data: rows } = await supabase.from("objectives").select(OBJECTIVE_COLUMNS).eq("quarter", quarter);
  for (const o of (rows ?? []).map(parseObjective)) {
    let changed = false;
    const key_results = o.key_results.map((k) => {
      const v = input.kr_values[k.id];
      if (typeof v === "number" && v !== k.current) {
        changed = true;
        return { ...k, current: v };
      }
      return k;
    });
    if (changed) await supabase.from("objectives").update({ key_results }).eq("id", o.id);
  }
}

export async function setCommitmentDone(week: string, index: number, done: boolean): Promise<ActionResult> {
  try {
    if (!isWeekId(week)) return fail("That week doesn't exist.");
    const { supabase } = await authed();
    const { data, error } = await supabase
      .from("reviews")
      .select("week, carried, reflection, confidence, kr_values, next, sparring, completed_at, updated_at")
      .eq("week", week)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("That review no longer exists.");
    const review = parseReview(data);
    if (!review.next[index]) return fail("That commitment no longer exists.");
    const next = review.next.map((n, i) => (i === index ? { ...n, done } : n));
    const { error: e2 } = await supabase.from("reviews").update({ next }).eq("week", week);
    if (e2) throw e2;
    revalidatePath("/app");
    return ok(undefined);
  } catch (e) {
    return fail(message(e));
  }
}

// ---------------------------------------------------------------- objectives

export async function createObjective(quarter: string, seed?: Partial<ObjectiveInput>): Promise<ActionResult<Objective>> {
  try {
    if (!isQuarterKey(quarter)) return fail("That quarter doesn't exist.");
    const { supabase, user } = await authed();
    const { count } = await supabase.from("objectives").select("id", { count: "exact", head: true }).eq("quarter", quarter);
    if ((count ?? 0) >= LIMITS.objectives) return fail("Three goals is the limit. Delete one to add another.");

    const input = objectiveInputSchema.parse({
      title: seed?.title ?? "",
      why: seed?.why ?? "",
      key_results: seed?.key_results ?? [
        { id: newId(), title: "", kind: "outcome", start: 0, current: 0, target: 0, unit: "" },
      ],
    });
    const { data, error } = await supabase
      .from("objectives")
      .insert({ user_id: user.id, quarter, position: count ?? 0, ...input })
      .select(OBJECTIVE_COLUMNS)
      .single();
    if (error) {
      if (error.message.includes("objective_limit")) return fail("Three goals is the limit. Delete one to add another.");
      throw error;
    }
    revalidatePath("/app", "layout");
    return ok(parseObjective(data));
  } catch (e) {
    return fail(message(e));
  }
}

export async function updateObjective(id: string, raw: ObjectiveInput): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const input = objectiveInputSchema.parse(raw);
    const { supabase } = await authed();
    const { data, error } = await supabase
      .from("objectives")
      .update({ title: input.title, why: input.why, key_results: input.key_results })
      .eq("id", id)
      .select("updated_at")
      .single();
    if (error) throw error;
    revalidatePath("/app");
    return ok({ savedAt: data.updated_at as string });
  } catch (e) {
    return fail(message(e));
  }
}

export async function deleteObjective(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await authed();
    const { error } = await supabase.from("objectives").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/app", "layout");
    return ok(undefined);
  } catch (e) {
    return fail(message(e));
  }
}

const FOUNDATION_TAKEN = "That foundation already has a goal this quarter. One per foundation.";

export async function setObjectiveFoundation(id: string, foundation: string | null): Promise<ActionResult> {
  try {
    const parsed = foundationSchema.shape.id.nullable().parse(foundation);
    const { supabase } = await authed();
    const { data: row, error: e1 } = await supabase.from("objectives").select("id, quarter").eq("id", id).maybeSingle();
    if (e1) throw e1;
    if (!row) return fail("That goal no longer exists.");

    if (parsed) {
      const { data: asp, error: e2 } = await supabase.from("aspirations").select(ASPIRATION_COLUMNS).maybeSingle();
      if (e2) throw e2;
      if (!parseAspiration(asp).foundations.some((f) => f.id === parsed)) return fail("That foundation no longer exists. Reload the page.");
      const { data: taken, error: e3 } = await supabase
        .from("objectives")
        .select("id")
        .eq("quarter", row.quarter as string)
        .eq("foundation", parsed)
        .neq("id", id)
        .limit(1);
      if (e3) throw e3;
      if (taken && taken.length) return fail(FOUNDATION_TAKEN);
    }

    const { error } = await supabase.from("objectives").update({ foundation: parsed }).eq("id", id);
    if (error) {
      if (error.code === "23505") return fail(FOUNDATION_TAKEN);
      throw error;
    }
    revalidatePath("/app", "layout");
    return ok(undefined);
  } catch (e) {
    return fail(message(e));
  }
}

// ---------------------------------------------------------------- aspiration

export async function saveAspiration(raw: AspirationInput): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const input = aspirationInputSchema.parse(raw);
    const ids = input.foundations.map((f) => f.id);
    if (new Set(ids).size !== ids.length) return fail("Two foundations share an id. Reload the page.");
    const clean = {
      horizon_year: input.horizon_year,
      vision: input.vision,
      foundations: input.foundations.map((f) => ({ id: f.id, name: f.name.trim() })),
      questions: input.questions.map((q) => q.trim()).filter(Boolean),
    };
    const { supabase, user } = await authed();
    const { data, error } = await supabase
      .from("aspirations")
      .upsert({ user_id: user.id, ...clean }, { onConflict: "user_id" })
      .select("updated_at")
      .single();
    if (error) throw error;

    let untag = supabase.from("objectives").update({ foundation: null }).not("foundation", "is", null);
    if (ids.length) untag = untag.not("foundation", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
    const { error: e2 } = await untag;
    if (e2) throw e2;

    revalidatePath("/app", "layout");
    return ok({ savedAt: data.updated_at as string });
  } catch (e) {
    return fail(message(e));
  }
}

// ---------------------------------------------------------------- evidence

export async function createEvidence(raw: EvidenceInput): Promise<ActionResult<EvidenceEntry>> {
  try {
    const input = evidenceInputSchema.parse(raw);
    const { supabase, user } = await authed();

    if (input.objective_id) {
      const { data: objective, error: objectiveError } = await supabase
        .from("objectives")
        .select("id, key_results")
        .eq("id", input.objective_id)
        .maybeSingle();
      if (objectiveError) throw objectiveError;
      if (!objective) return fail("That goal no longer exists.");
      if (input.kr_id) {
        const ids = Array.isArray(objective.key_results)
          ? objective.key_results.flatMap((k: unknown) =>
              k && typeof k === "object" && "id" in k && typeof (k as { id?: unknown }).id === "string"
                ? [(k as { id: string }).id]
                : [],
            )
          : [];
        if (!ids.includes(input.kr_id)) return fail("That key result no longer belongs to the selected goal.");
      }
    }

    const { data, error } = await supabase
      .from("evidence_entries")
      .insert({ user_id: user.id, ...input, kr_id: input.kr_id || null })
      .select(EVIDENCE_COLUMNS)
      .single();
    if (error) throw error;
    revalidatePath("/app/log");
    revalidatePath("/app");
    return ok(parseEvidence(data));
  } catch (e) {
    return fail(message(e));
  }
}

// ---------------------------------------------------------------- profile & account

export async function updateProfile(raw: ProfileInput): Promise<ActionResult> {
  try {
    const input = profileInputSchema.parse(raw);
    const { supabase, user } = await authed();
    const { error } = await supabase.from("profiles").update(input).eq("id", user.id);
    if (error) throw error;
    revalidatePath("/app", "layout");
    return ok(undefined);
  } catch (e) {
    return fail(message(e));
  }
}

export async function completeOnboarding(
  raw: ProfileInput,
  quarter: string,
  firstObjective: { title: string; why: string } | null,
): Promise<ActionResult> {
  try {
    const input = profileInputSchema.parse(raw);
    const { supabase, user } = await authed();
    const { error } = await supabase
      .from("profiles")
      .update({ ...input, onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;
    if (firstObjective && firstObjective.title.trim()) {
      const res = await createObjective(quarter, { title: firstObjective.title.trim(), why: firstObjective.why.trim() });
      if (!res.ok) return res;
    }
    revalidatePath("/app", "layout");
    return ok(undefined);
  } catch (e) {
    return fail(message(e));
  }
}

export async function signOut() {
  const { supabase } = await getSession();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim().toUpperCase() !== "DELETE") return fail('Type DELETE to confirm.');
  try {
    const { supabase, user } = await authed();
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    await supabase.auth.signOut();
  } catch (e) {
    return fail(message(e));
  }
  redirect("/?deleted=1");
}
