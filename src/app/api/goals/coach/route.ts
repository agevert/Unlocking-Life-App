import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ASPIRATION_COLUMNS, EVIDENCE_COLUMNS, OBJECTIVE_COLUMNS, getSession,
  parseAspiration, parseEvidence, parseObjective, parseReview,
} from "@/lib/data";
import {
  GOAL_COACH_SYSTEM, buildGoalCoachContext, goalCoachRequestSchema, goalCoachResponseSchema, isEditableGoalQuarter,
} from "@/lib/goal-coach";
import { createAdminClient } from "@/lib/supabase/admin";
import { quarterOf, todayIn } from "@/lib/week";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 80000;
const REVIEW_COLUMNS = "week, carried, reflection, confidence, kr_values, next, sparring, completed_at, updated_at";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Open the interview in this app to continue." }, 403);

  try {
    const { supabase, user } = await getSession();
    if (!user) return json({ error: "Sign in again to continue." }, 401);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json({ error: "Goal coaching isn't configured on this server." }, 503);

    const parsed = goalCoachRequestSchema.safeParse(await readBody(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Check your interview and try again." }, 400);
    const input = parsed.data;

    const { data: profile, error: profileError } = await supabase.from("profiles").select("timezone")
      .eq("id", user.id).maybeSingle();
    if (profileError) return json({ error: "Your profile couldn't be loaded. Try again." }, 503);
    const timezone = profile?.timezone ?? "Europe/Berlin";
    if (!isEditableGoalQuarter(input.quarter, timezone)) {
      return json({ error: "Create goals for this quarter or next quarter. Past quarters are read-only." }, 400);
    }
    const today = todayIn(timezone);
    const currentQuarter = quarterOf(today).key;

    const [aspirationResult, objectivesResult, reviewsResult, evidenceResult] = await Promise.all([
      supabase.from("aspirations").select(ASPIRATION_COLUMNS).eq("user_id", user.id).maybeSingle(),
      supabase.from("objectives").select(OBJECTIVE_COLUMNS).eq("user_id", user.id)
        .in("quarter", [...new Set([currentQuarter, input.quarter])]).order("position").limit(6),
      supabase.from("reviews").select(REVIEW_COLUMNS).eq("user_id", user.id)
        .not("completed_at", "is", null).order("week", { ascending: false }).limit(4),
      supabase.from("evidence_entries").select(EVIDENCE_COLUMNS).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(6),
    ]);
    if (objectivesResult.error) return json({ error: "Your current goals couldn't be loaded. Try again." }, 503);
    const aspiration = parseAspiration(aspirationResult.error ? null : aspirationResult.data);
    const objectives = (objectivesResult.data ?? []).map(parseObjective);
    if (objectives.filter((goal) => goal.quarter === input.quarter).length >= 3) {
      return json({ error: "Three goals is the limit. Delete one to add another." }, 409);
    }

    // Reserve one request atomically before calling the provider. Only the trusted server may choose the quota.
    const configuredLimit = Number(process.env.GOAL_COACH_DAILY_LIMIT || 40);
    const limit = Number.isInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 1000 ? configuredLimit : 40;
    let quota;
    try {
      quota = await createAdminClient().rpc("reserve_goal_coach_request", { p_user_id: user.id, p_limit: limit });
    } catch {
      return json({ error: "Goal coaching isn't configured on this server. Please try again later." }, 503);
    }
    if (quota.error || typeof quota.data !== "boolean") {
      return json({ error: "The interview couldn't start. Try again later." }, 503);
    }
    if (!quota.data) return json({ error: `You've used today's ${limit} coaching replies. Come back tomorrow.` }, 429);

    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 40000 });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 2500,
      system: `${GOAL_COACH_SYSTEM}\n\n${buildGoalCoachContext({
        quarter: input.quarter, currentQuarter, today, aspiration, objectives,
        reviews: (reviewsResult.error ? [] : reviewsResult.data ?? []).map(parseReview),
        evidence: (evidenceResult.error ? [] : evidenceResult.data ?? []).map(parseEvidence),
      }, input.intent, input.proposal)}`,
      messages: input.messages,
      tools: [{
        name: "goal_coach_reply",
        description: "Return one focused coaching reply and, when appropriate, an unsaved structured goal proposal.",
        input_schema: z.toJSONSchema(goalCoachResponseSchema) as Anthropic.Tool["input_schema"],
      }],
      tool_choice: { type: "tool", name: "goal_coach_reply" },
    });
    const tool = response.content.find((block) => block.type === "tool_use" && block.name === "goal_coach_reply");
    const result = goalCoachResponseSchema.safeParse(tool?.type === "tool_use" ? tool.input : null);
    if (!result.success || (input.intent === "propose" && !result.data.proposal)) {
      return json({ error: "The coach couldn't prepare a valid reply. Your interview is still here; try again." }, 502);
    }
    const foundation = result.data.proposal?.foundation;
    if (foundation && (!aspiration.foundations.some((item) => item.id === foundation)
      || objectives.some((goal) => goal.quarter === input.quarter && goal.foundation === foundation))) {
      return json({ error: "The coach suggested an unavailable foundation. Try again to revise the proposal." }, 502);
    }
    // This route never writes objectives. Only the acceptance action can create one.
    return json(result.data);
  } catch {
    return json({ error: "Goal coaching is unavailable right now. Your interview is still here; try again." }, 502);
  }
}
