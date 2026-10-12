"use client";

import { useMemo, useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions";
import { WEEKDAYS } from "@/lib/config";
import type { Profile } from "@/lib/schemas";
import { useToast } from "./Toast";

export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Berlin", "Europe/London", "America/New_York", "America/Santiago", "Asia/Singapore"];
  }
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name);
  const [tz, setTz] = useState(profile.timezone);
  const [day, setDay] = useState(profile.review_weekday);
  const [reminders, setReminders] = useState(profile.reminders_enabled);
  const [pending, start] = useTransition();
  const toast = useToast();
  const zones = useMemo(() => {
    const z = timeZones();
    return z.includes(tz) ? z : [tz, ...z];
  }, [tz]);

  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateProfile({ display_name: name, timezone: tz, review_weekday: day, reminders_enabled: reminders });
          toast(res.ok ? "Settings saved" : res.error);
        });
      }}
    >
      <h2>Profile and rhythm</h2>
      <label className="field">
        <span className="label">Name</span>
        <input className="input" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span className="label">Email</span>
        <span className="muted">{profile.email}</span>
      </div>
      <label className="field">
        <span className="label">Time zone</span>
        <span className="hint">Weeks and quarters follow this time zone.</span>
        <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Review day</span>
        <span className="hint">The day you run your weekly review. Friday afternoon works for most people.</span>
        <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
      </label>
      <label className="row" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
        <span>Email me on my review day if the week isn&apos;t reviewed yet</span>
      </label>
      <div><button className="btn primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}
