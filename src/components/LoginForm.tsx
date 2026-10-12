"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, google }: { next: string; google: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : error.message);
    setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setError("That code didn't work. Check the latest email, or request a new one.");
    router.replace(next);
    router.refresh();
  }

  async function withGoogle() {
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setBusy(false);
      setError(error.message);
    }
  }

  if (stage === "code") {
    return (
      <form className="stack" onSubmit={verify}>
        <p>
          We sent a sign-in email to <strong>{email}</strong>. Tap the link in it, or enter the code from the email here. On an
          installed phone app, the code is easier.
        </p>
        <label className="field">
          <span className="label">Code from the email</span>
          <input
            className="input mono"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
          />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
        <button type="button" className="linkbtn" onClick={() => { setStage("email"); setCode(""); setError(null); }}>
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <div className="stack">
      {google ? (
        <>
          <button type="button" className="btn" onClick={withGoogle} disabled={busy}>Continue with Google</button>
          <div className="divider">or</div>
        </>
      ) : null}
      <form className="stack" onSubmit={sendLink}>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
      </form>
    </div>
  );
}
