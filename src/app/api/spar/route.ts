import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, parseObjective, parseReview } from "@/lib/data";
import { SPARRING_SYSTEM, buildSparringPrompt } from "@/lib/prompt";
import { isWeekId, quarterLabel, quarterOfWeek, quarterPace, todayIn, addDays, weekMonday } from "@/lib/week";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ week: z.string() });

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sparring isn't configured on this server." }, { status: 503 });

  const { supabase, user } = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isWeekId(parsed.data.week)) {
    return NextResponse.json({ error: "That week doesn't exist." }, { status: 400 });
  }
  const week = parsed.data.week;

  // Rate limit per user per 24 hours.
  const limit = Number(process.env.SPAR_DAILY_LIMIT || 8);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("spar_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `You've used today's ${limit} challenges. The partner is back tomorrow.` },
      { status: 429 },
    );
  }

  const quarter = quarterOfWeek(week);
  const [{ data: reviewRow }, { data: objectiveRows }, { data: historyRows }, { data: profile }] = await Promise.all([
    supabase
      .from("reviews")
      .select("week, carried, reflection, confidence, kr_values, next, sparring, completed_at, updated_at")
      .eq("week", week)
      .maybeSingle(),
    supabase
      .from("objectives")
      .select("id, quarter, position, title, why, key_results, created_at, updated_at")
      .eq("quarter", quarter.key)
      .order("position"),
    supabase
      .from("reviews")
      .select("week, carried, reflection, confidence, kr_values, next, sparring, completed_at, updated_at")
      .lt("week", week)
      .order("week", { ascending: false })
      .limit(6),
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
  ]);

  if (!reviewRow) return NextResponse.json({ error: "Save the review first." }, { status: 409 });
  const review = parseReview(reviewRow);
  if (!review.completed_at) return NextResponse.json({ error: "Complete the review first." }, { status: 409 });

  const today = todayIn(profile?.timezone ?? "Europe/Berlin");
  const weekEnd = addDays(weekMonday(week), 6);
  const asOf = weekEnd < today ? weekEnd : today;

  const prompt = buildSparringPrompt({
    week,
    pace: quarterPace(asOf, quarter),
    quarterLabel: quarterLabel(quarter.key),
    objectives: (objectiveRows ?? []).map(parseObjective),
    review,
    history: (historyRows ?? []).map(parseReview),
  });

  await supabase.from("spar_events").insert({ user_id: user.id, week });

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        const response = client.messages.stream({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
          max_tokens: 900,
          system: SPARRING_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        if (full.trim()) {
          await supabase.from("reviews").update({ sparring: full.slice(0, 6000) }).eq("week", week);
        }
        controller.close();
      } catch (e) {
        console.error("sparring failed", e);
        if (!full) controller.error(e);
        else controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
