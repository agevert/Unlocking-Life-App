"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { completeOnboarding } from "@/lib/actions";
import { WEEKDAYS } from "@/lib/config";
import type { Profile } from "@/lib/schemas";
import { Brand } from "./Brand";

export function Onboarding({ profile, quarter, quarterName }: { profile: Profile; quarter: string; quarterName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.display_name);
  const [day, setDay] = useState(profile.review_weekday);
  const [tz, setTz] = useState(profile.timezone);
  const [reminders, setReminders] = useState(true);
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTz(detected);
    } catch {}
  }, []);

  const finish = (withObjective: boolean) =>
    start(async () => {
      setError(null);
      const res = await completeOnboarding(
        { display_name: name, timezone: tz, review_weekday: day, reminders_enabled: reminders },
        quarter,
        withObjective ? { title, why } : null,
      );
      if (!res.ok) return setError(res.error);
      router.push(withObjective && title.trim() ? "/app/objectives" : "/app");
      router.refresh();
    });

  return (
    <div className="card stack" style={{ maxWidth: 520, "--gap": "18px" } as React.CSSProperties}>
      <div className="spread" style={{ alignItems: "center" }}>
        <Brand href="/" />
        <span className="mono muted" style={{ fontSize: "0.8rem" }} aria-label={`Step ${step + 1} of 3`}>{step + 1} / 3</span>
      </div>

      {step === 0 ? (
        <>
          <h1>Fewer goals. Weekly truth.</h1>
          <ul className="howto" style={{ paddingLeft: "1.2em" }}>
            <li><strong>Three objectives a quarter.</strong> No more. Focus is what you say no to.</li>
            <li><strong>Thirty minutes a week.</strong> Check what you promised, update the numbers, write what you avoided, pick next week&apos;s three.</li>
            <li><strong>A sparring partner.</strong> Claude reads your review and pushes back where you&apos;re going easy on yourself.</li>
          </ul>
          <button className="btn primary" onClick={() => setStep(1)}>Set it up · 2 minutes</button>
        </>
      ) : null}

      {step === 1 ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <h1>About you</h1>
          <label className="field">
            <span className="label">What should we call you?</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} autoFocus />
          </label>
          <label className="field">
            <span className="label">When will you do your weekly review?</span>
            <span className="hint">Pick a day you can protect for 30 minutes. Friday afternoon is the classic.</span>
            <select className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="row" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
            <span>Email me on that day if I haven&apos;t reviewed yet</span>
          </label>
          <p className="muted" style={{ fontSize: "0.84rem" }}>Time zone: {tz.replace(/_/g, " ")}. You can change it in Settings.</p>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStep(0)}>Back</button>
            <button type="submit" className="btn primary">Continue</button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); finish(true); }}>
          <h1>Your first objective for {quarterName}</h1>
          <p className="muted">The one that would make the quarter a success on its own. You&apos;ll add key results next.</p>
          <label className="field">
            <span className="label">Objective</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Make the new region profitable" autoFocus />
          </label>
          <label className="field">
            <span className="label">Why it matters now</span>
            <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={400} placeholder="One sentence" />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="btn primary" disabled={pending || !title.trim()}>{pending ? "Saving…" : "Add key results"}</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => finish(false)}>Skip for now</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
