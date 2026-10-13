import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/LegalShell";
import { getSession } from "@/lib/data";

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [{ user }, sp] = await Promise.all([getSession(), searchParams]);
  const cta = user ? { href: "/app", label: "Open today" } : { href: "/login", label: "Start free" };

  return (
    <div className="site">
      <header className="site-nav">
        <Brand />
        <Link href={user ? "/app" : "/login"} className="btn small">{user ? "Open app" : "Sign in"}</Link>
      </header>

      {sp.deleted ? <p className="notice" role="status">Your account and all your data have been deleted.</p> : null}

      <section className="hero">
        <div>
          <div className="eyebrow">A personal capability coach</div>
          <h1 style={{ marginTop: 10 }}>Turn intentional action into <em>increased capability.</em></h1>
          <p className="lede">
            Unlocking Life connects a long-term vision to quarterly goals, deliberate practice, observable evidence and a weekly coaching loop. It does not reward being busy; it asks what actually changed.
          </p>
          <div className="row" style={{ marginTop: 26 }}>
            <Link href={cta.href} className="btn primary">{cta.label}</Link>
            <a href="#how" className="btn ghost">How it works</a>
          </div>
        </div>

        <div className="preview stack" aria-label="Product preview">
          <div className="eyebrow">Coach · Today</div>
          <h2 style={{ fontSize: "1.65rem" }}>Create evidence, not activity.</h2>
          <p className="muted">Choose one practice, experiment or real-world action that attacks the current bottleneck.</p>
          <div className="callout">
            <div><span className="eyebrow">Current bottleneck</span><p style={{ marginTop: 4 }}>Your plan is clear, but there is no observable evidence from this week yet.</p></div>
          </div>
          <div><span className="btn primary">Log deliberate practice →</span></div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="three">
          <div className="stack numbered"><b>01</b><h2>Choose what matters</h2><p className="muted">Set the long horizon, then at most three quarterly goals with evidence-based key results.</p></div>
          <div className="stack numbered"><b>02</b><h2>Practice in reality</h2><p className="muted">Run deliberate reps and real-world experiments. Capture what changed while the learning is fresh.</p></div>
          <div className="stack numbered"><b>03</b><h2>Attack the bottleneck</h2><p className="muted">A weekly coach separates activity from evidence, finds the constraint and proposes the next practice.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="callout" style={{ padding: "26px 24px" }}>
          <div><h2>One loop. Less dashboard, more coaching.</h2><p className="muted" style={{ marginTop: 4 }}>Works in the browser, installs on your phone, and supports voice dictation into text fields.</p></div>
          <Link href={cta.href} className="btn primary">{cta.label}</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
