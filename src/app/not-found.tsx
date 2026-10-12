import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth">
      <div className="card stack">
        <span className="eyebrow">404</span>
        <h1>This page doesn&apos;t exist</h1>
        <p className="muted">The link may be old, or the week you asked for is in the future.</p>
        <Link className="btn primary" href="/app">Back to this week</Link>
      </div>
    </main>
  );
}
