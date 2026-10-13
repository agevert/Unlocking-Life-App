import "@/app/coaching.css";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { Brand } from "@/components/Brand";
import { QuarterStrip } from "@/components/QuarterStrip";
import { UserMenu } from "@/components/UserMenu";
import { getClock, getProfile, getReviews } from "@/lib/data";
import { dayOfQuarter, quarterLabel, weekNumber } from "@/lib/week";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile.onboarded_at) redirect("/app/welcome");
  const [clock, reviews] = await Promise.all([getClock(), getReviews(60)]);
  const status: Record<string, "done" | "draft"> = {};
  for (const r of reviews) status[r.week] = r.completed_at ? "done" : "draft";

  return (
    <div className="shell">
      <header className="topbar">
        <Brand href="/app" />
        <div className="row" style={{ "--gap": "14px" } as React.CSSProperties}>
          <div className="clock">
            {quarterLabel(clock.quarter.key)} · Week <b>{weekNumber(clock.currentWeek)}</b>
            <br />
            Day <b>{dayOfQuarter(clock.today, clock.quarter)}</b> of {clock.quarter.days} · {Math.round(clock.pace * 100)}% gone
          </div>
          <UserMenu name={profile.display_name} email={profile.email} />
        </div>
      </header>
      <QuarterStrip quarter={clock.quarter} currentWeek={clock.currentWeek} status={status} />
      <AppNav />
      <main id="main" className="stack" style={{ "--gap": "26px" } as React.CSSProperties}>
        {children}
      </main>
    </div>
  );
}
