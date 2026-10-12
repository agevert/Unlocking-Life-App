import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { Brand } from "@/components/Brand";
import { googleAuthEnabled } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="auth">
      <div className="card stack" style={{ "--gap": "18px" } as React.CSSProperties}>
        <Brand />
        <div className="stack" style={{ "--gap": "6px" } as React.CSSProperties}>
          <h1>Sign in</h1>
          <p className="muted">New here? The same step creates your account. No password needed.</p>
        </div>
        {sp.error ? <p className="notice" role="alert">That sign-in link has expired or was already used. Request a new one below.</p> : null}
        <LoginForm next={safeNext(sp.next)} google={googleAuthEnabled} />
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          By continuing you agree to the <a href="/legal/terms">terms</a> and acknowledge the <a href="/legal/privacy">privacy policy</a>.
        </p>
      </div>
    </main>
  );
}
