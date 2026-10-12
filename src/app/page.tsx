import Link from "next/link";
import { Brand } from "@/components/Brand";
import { KrRow } from "@/components/KrBar";
import { SiteFooter } from "@/components/LegalShell";
import { getSession } from "@/lib/data";

const SAMPLE_PACE = 0.46;

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [{ user }, sp] = await Promise.all([getSession(), searchParams]);
  const cta = user ? { href: "/app", label: "Open your week" } : { href: "/login", label: "Start free" };

  return (
    <div className="site">
      <header className="site-nav">
        <Brand />
        <Link href={user ? "/app" : "/login"} className="btn small">{user ? "Open app" : "Sign in"}</Link>
      </header>

      {sp.deleted ? <p className="notice" role="status">Your account and all your data have been deleted.</p> : null}

      <section className="hero">
        <div>
          <div className="eyebrow">Weekly OKR review</div>
          <h1 style={{ marginTop: 10 }}>
            Three objectives. <em>Thirty minutes</em> a week. No excuses.
          </h1>
          <p className="lede">
            Most goal systems die in week three. Threefold caps you at three objectives, walks you through a four-step weekly
            review, and gives you a sparring partner that reads your answers and pushes back where you&apos;re going easy on
            yourself.
          </p>
          <div className="row" style={{ marginTop: 26 }}>
            <Link href={cta.href} className="btn primary">{cta.label}</Link>
            <a href="#how" className="btn ghost">How it works</a>
          </div>
        </div>

        <div className="preview" aria-label="Product preview" role="img">
          <div className="spread">
            <span className="eyebrow">Q4 · Week 46</span>
            <span className="mono muted" style={{ fontSize: "0.75rem" }}>46% of the quarter gone</span>
          </div>
          <div className="qstrip" aria-hidden="true">
            {Array.from({ length: 13 }, (_, i) => (
              <div key={i} className={`qcell${i < 6 ? (i === 3 ? " past" : " done") : ""}${i === 6 ? " current" : ""}`}>
                <i style={{ height: 14 }} />
              </div>
            ))}
          </div>
          <div className="obj" style={{ gap: 10 }}>
            <div className="obj-head">
              <div>
                <h3>Make the new region profitable</h3>
                <p className="obj-why" style={{ fontSize: "0.82rem" }}>The board decides on expansion in January.</p>
              </div>
              <div className="conf"><b className="mono">6</b><small>Confidence</small></div>
            </div>
            <KrRow pace={SAMPLE_PACE} kr={{ id: "a", title: "Monthly contribution margin", kind: "outcome", start: -40, current: -12, target: 0, unit: "k€" }} />
            <KrRow pace={SAMPLE_PACE} kr={{ id: "b", title: "Qualified buyer meetings", kind: "input", start: 0, current: 4, target: 15, unit: "" }} />
          </div>
          <ul className="commits">
            <li className="commit done"><input type="checkbox" checked readOnly tabIndex={-1} /><label><span className="t">Pricing proposal sent to the two largest accounts</span></label></li>
            <li className="commit"><input type="checkbox" readOnly tabIndex={-1} /><label><span className="t">Book four buyer meetings for next week</span></label></li>
          </ul>
        </div>
      </section>

      <section className="section" id="how">
        <div className="three">
          <div className="stack numbered">
            <b>01</b>
            <h2>Set three bets</h2>
            <p className="muted">Up to three objectives per quarter, each with measurable key results. The limit is enforced, because focus is what you say no to.</p>
          </div>
          <div className="stack numbered">
            <b>02</b>
            <h2>Review every week</h2>
            <p className="muted">Did you do what you said? Update the numbers, rate your confidence, write what you avoided, and commit to next week&apos;s three. It autosaves as you go.</p>
          </div>
          <div className="stack numbered">
            <b>03</b>
            <h2>Get challenged</h2>
            <p className="muted">One tap sends your review to a sparring partner powered by Claude. It names the pattern, asks the hard questions and tells you which commitment to swap.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="three">
          <div className="stack">
            <h3>Pace, not percentages</h3>
            <p className="muted">Every key result shows where linear progress would be today, so &ldquo;12%&rdquo; in week two reads as on track, not as failure.</p>
          </div>
          <div className="stack">
            <h3>Confidence over time</h3>
            <p className="muted">A weekly 1–10 rating per objective. Two drops in a row is your signal to re-plan, not to try harder.</p>
          </div>
          <div className="stack">
            <h3>Private by design</h3>
            <p className="muted">Hosted in the EU. No ads, no tracking. Export everything or delete your account in one click.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="callout" style={{ padding: "26px 24px" }}>
          <div>
            <h2>Your next review takes thirty minutes.</h2>
            <p className="muted" style={{ marginTop: 4 }}>Works in the browser and installs on your phone like an app.</p>
          </div>
          <Link href={cta.href} className="btn primary">{cta.label}</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
