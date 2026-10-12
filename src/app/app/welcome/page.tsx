import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { getClock, getProfile } from "@/lib/data";
import { quarterLabel } from "@/lib/week";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const profile = await getProfile();
  if (profile.onboarded_at) redirect("/app");
  const clock = await getClock();
  return (
    <main className="auth">
      <Onboarding profile={profile} quarter={clock.quarter.key} quarterName={quarterLabel(clock.quarter.key)} />
    </main>
  );
}
