import { NextResponse } from "next/server";
import { APP_NAME, siteUrl } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultReviewWeek, todayIn, weekNumber, weekRange, weekday } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day (see vercel.json). Emails everyone whose review day is today
 * and who hasn't completed that week's review yet.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM;
  if (!resendKey || !from) return NextResponse.json({ skipped: "Reminder email is not configured" });

  const admin = createAdminClient();
  let sent = 0;
  let checked = 0;
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, email, display_name, timezone, review_weekday, last_reminder_week")
      .eq("reminders_enabled", true)
      .not("onboarded_at", "is", null)
      .range(offset, offset + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!profiles?.length) break;

    for (const p of profiles) {
      checked++;
      if (!p.email) continue;
      const today = todayIn(p.timezone);
      if (weekday(today) !== p.review_weekday) continue;
      const week = defaultReviewWeek(today);
      if (p.last_reminder_week === week) continue;

      const { data: review } = await admin
        .from("reviews")
        .select("completed_at")
        .eq("user_id", p.id)
        .eq("week", week)
        .maybeSingle();
      if (review?.completed_at) continue;

      const ok = await sendReminder(resendKey, from, p.email, p.display_name, week);
      if (ok) {
        sent++;
        await admin.from("profiles").update({ last_reminder_week: week }).eq("id", p.id);
      }
    }
    if (profiles.length < pageSize) break;
  }

  return NextResponse.json({ checked, sent });
}

async function sendReminder(key: string, from: string, to: string, name: string, week: string) {
  const first = name.split(" ")[0];
  const url = `${siteUrl}/app/review/${week}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f1;font-family:-apple-system,Segoe UI,sans-serif;color:#14171c">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5b636d;margin:0 0 8px">${APP_NAME}</p>
    <h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">${first ? `${escapeHtml(first)}, w` : "W"}eek ${weekNumber(week)} is ready for its review</h1>
    <p style="font-size:16px;line-height:1.55;margin:0 0 20px;color:#3a4049">${weekRange(week)}. Thirty minutes: check what you committed to, update the numbers, write what you avoided, and choose next week's three.</p>
    <a href="${url}" style="display:inline-block;background:#2340c8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:9px;font-weight:600">Start the review</a>
    <p style="font-size:13px;color:#5b636d;margin:28px 0 0">You get this on your review day when the week isn't reviewed yet. <a href="${siteUrl}/app/settings" style="color:#5b636d">Change or turn off reminders</a>.</p>
  </div></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `Week ${weekNumber(week)}: time for your review`,
      html,
      headers: { "List-Unsubscribe": `<${siteUrl}/app/settings>` },
    }),
  });
  if (!res.ok) console.error("reminder failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
