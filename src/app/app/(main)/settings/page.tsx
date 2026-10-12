import type { Metadata } from "next";
import { DeleteAccount } from "@/components/DeleteAccount";
import { SettingsForm } from "@/components/SettingsForm";
import { getProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getProfile();
  return (
    <>
      <div>
        <div className="eyebrow">Settings</div>
        <h1>Your account</h1>
      </div>
      <SettingsForm profile={profile} />
      <section className="card stack">
        <h2>Your data</h2>
        <p className="muted">Download everything stored about you as a JSON file: profile, objectives and every review.</p>
        <div><a className="btn" href="/api/export" download>Download my data</a></div>
      </section>
      <DeleteAccount />
    </>
  );
}
