import "@/app/coaching.css";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { Brand } from "@/components/Brand";
import { UserMenu } from "@/components/UserMenu";
import { VoiceDock } from "@/components/VoiceDock";
import { getClock, getProfile } from "@/lib/data";
import { quarterLabel, weekNumber } from "@/lib/week";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile.onboarded_at) redirect("/app/welcome");
  const clock = await getClock();

  return (
    <div className="shell v2-shell">
      <header className="topbar v2-topbar">
        <Brand href="/app" />
        <div className="v2-top-meta">
          <div className="v2-period">
            <span>{quarterLabel(clock.quarter.key)}</span>
            <span>Week {weekNumber(clock.currentWeek)}</span>
            <span>{Math.round(clock.pace * 100)}% through</span>
          </div>
          <UserMenu name={profile.display_name} email={profile.email} />
        </div>
      </header>
      <AppNav />
      <main id="main" className="stack v2-main" style={{ "--gap": "28px" } as React.CSSProperties}>
        {children}
      </main>
      <VoiceDock />
    </div>
  );
}
