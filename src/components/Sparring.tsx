"use client";

import { useRef, useState } from "react";

export function Sparring({ week, initial, enabled }: { week: string; initial: string | null; enabled: boolean }) {
  const [text, setText] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setText("");
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const res = await fetch("/api/spar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Couldn't get coaching feedback this time. Try again in a minute.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setText(initial ?? "");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="sparring" className="card spar stack" aria-labelledby="spar-title">
      <div className="spread">
        <div>
          <div className="eyebrow">Coach</div>
          <h2 id="spar-title" style={{ fontSize: "1.15rem" }}>Find the bottleneck</h2>
        </div>
        <button type="button" className="btn" onClick={run} disabled={!enabled || busy}>
          {busy ? "Thinking…" : text ? "Coach me again" : "Coach this review"}
        </button>
      </div>
      <div className="spar-out" aria-live="polite" aria-busy={busy}>
        {text ? (
          text
        ) : (
          <span className="muted">
            {enabled
              ? "Your coach reads the objectives, numbers and reflection, separates activity from evidence, identifies the current bottleneck, and proposes the next deliberate practice."
              : "Complete the review first, then ask the coach to diagnose the bottleneck."}
          </span>
        )}
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {text && !busy ? (
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Use the bottleneck and next practice to sharpen the coming week before you close the page.
        </p>
      ) : null}
    </section>
  );
}
