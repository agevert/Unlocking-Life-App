import { NextResponse } from "next/server";
import { getSession } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GDPR Art. 20: a complete, machine-readable copy of everything stored about the user. */
export async function GET() {
  const { supabase, user } = await getSession();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [profile, aspiration, objectives, reviews] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("aspirations").select("*").maybeSingle(),
    supabase.from("objectives").select("*").order("quarter").order("position"),
    supabase.from("reviews").select("*").order("week"),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    aspiration: aspiration.data ?? null,
    objectives: objectives.data ?? [],
    reviews: reviews.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="threefold-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
