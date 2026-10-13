import type { Metadata } from "next";
import { DeleteAccount } from "@/components/DeleteAccount";
import { SettingsForm } from "@/components/SettingsForm";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <>
      <div className="page-intro">
        <div className="eyebrow">Settings</div>
        <h1>Your account</h1>
      </div>
      <SettingsForm profile={profile} />
      <section className="card stack">
        <h2>Your data</h2>
        <p className="muted">Download your profile, vision, goals, evidence entries and weekly reviews as one JSON file.</p>
        <div><a className="btn" href="/api/export" download>Download my data</a></div>
      </section>
      <DeleteAccount />
    </>
  );
}
