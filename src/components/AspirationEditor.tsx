"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveAspiration } from "@/lib/actions";
import { LIMITS } from "@/lib/config";
import { newId } from "@/lib/okr";
import type { Aspiration } from "@/lib/schemas";
import { useToast } from "./Toast";

type SaveState = "saved" | "saving" | "error";

/**
 * Autosaving editor for the long-term layer: vision, foundations, open questions.
 * `coverage` maps a foundation id to the title of this quarter's objective tagged with it.
 */
export function AspirationEditor({
  initial,
  coverage,
  quarterLabel,
  suggestedYear,
}: {
  initial: Aspiration;
  coverage: Record<string, string>;
  quarterLabel: string;
  suggestedYear: number;
}) {
  const [a, setA] = useState(initial);
  const [yearText, setYearText] = useState(initial.horizon_year ? String(initial.horizon_year) : "");
  const [state, setState] = useState<SaveState>("saved");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const toast = useToast();
  const first = useRef(true);
  const latest = useRef(a);
  latest.current = a;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(async () => {
      const { horizon_year, vision, foundations, questions } = latest.current;
      const res = await saveAspiration({ horizon_year, vision, foundations, questions });
      if (res.ok) setState("saved");
      else {
        setState("error");
        toast(res.error);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [a, toast]);

  const setYear = (v: string) => {
    setYearText(v);
    const n = Number(v);
    // A half-typed year saves as "no horizon" rather than erroring on every keystroke.
    setA((x) => ({ ...x, horizon_year: v && Number.isInteger(n) && n >= 2000 && n <= 2200 ? n : null }));
  };

  const removeFoundation = (id: string) => {
    setA((x) => ({ ...x, foundations: x.foundations.filter((f) => f.id !== id) }));
    setConfirmRemove(null);
  };

  const yearWord = a.horizon_year ?? suggestedYear;

  return (
    <div className="stack" style={{ "--gap": "18px" } as React.CSSProperties}>
      <div className="spread">
        <span className="eyebrow">Changes save automatically</span>
        <span className="status" data-state={state} aria-live="polite">
          {state === "saving" ? "Saving…" : state === "error" ? "Not saved" : "Saved"}
        </span>
      </div>

      <section className="card stack" aria-labelledby="asp-vision-h">
        <h2 id="asp-vision-h">Vision</h2>
        <div className="asp-vision-grid">
          <label className="field">
            <span className="label">Horizon year</span>
            <input
              className="input mono"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2200}
              placeholder={String(suggestedYear)}
              value={yearText}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Where you are in {yearWord}</span>
            <span className="hint">Written as if it already happened, concrete enough to tell when you&apos;re off track.</span>
            <textarea
              className="input"
              maxLength={1200}
              value={a.vision}
              placeholder="Where you live, who's around you, what you've built, what you're free to do."
              onChange={(e) => setA((x) => ({ ...x, vision: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="card stack" aria-labelledby="asp-found-h">
        <div>
          <h2 id="asp-found-h">Foundations</h2>
          <p className="muted asp-hint">
            Up to three areas that, if they go well, carry the rest. Each quarter gets one objective per foundation.
          </p>
        </div>
        {a.foundations.map((f, i) => (
          <div key={f.id} className="stack" style={{ "--gap": "6px" } as React.CSSProperties}>
            <div className="asp-row">
              <span className="asp-num mono" aria-hidden="true">{i + 1}</span>
              <input
                className="input"
                aria-label={`Foundation ${i + 1}`}
                maxLength={80}
                value={f.name}
                placeholder={["Body and mind", "Family and friends", "Work and wealth"][i] ?? "Foundation"}
                onChange={(e) =>
                  setA((x) => ({ ...x, foundations: x.foundations.map((y) => (y.id === f.id ? { ...y, name: e.target.value } : y)) }))
                }
              />
              <button
                type="button"
                className="btn ghost small"
                aria-label={`Remove foundation ${i + 1}`}
                onClick={() => (coverage[f.id] ? setConfirmRemove(f.id) : removeFoundation(f.id))}
              >
                ✕
              </button>
            </div>
            {confirmRemove === f.id ? (
              <div className="row asp-confirm" role="group" aria-label="Confirm remove">
                <span className="muted">This unlinks &ldquo;{coverage[f.id]}&rdquo; from it.</span>
                <button type="button" className="btn small" onClick={() => setConfirmRemove(null)}>Keep</button>
                <button type="button" className="btn small danger solid" onClick={() => removeFoundation(f.id)}>Remove</button>
              </div>
            ) : null}
          </div>
        ))}
        {!a.foundations.length ? <p className="empty">No foundations yet. Name the first one.</p> : null}
        <div>
          <button
            type="button"
            className="btn"
            disabled={a.foundations.length >= LIMITS.foundations}
            onClick={() => {
              const id = newId();
              setA((x) => ({ ...x, foundations: [...x.foundations, { id, name: "" }] }));
              requestAnimationFrame(() =>
                (document.querySelectorAll<HTMLInputElement>(".asp-row input"))[latest.current.foundations.length - 1]?.focus(),
              );
            }}
          >
            {a.foundations.length >= LIMITS.foundations ? "Three is the limit" : "+ Add foundation"}
          </button>
        </div>
      </section>

      <section className="card stack" aria-labelledby="asp-q-h">
        <div>
          <h2 id="asp-q-h">Open questions</h2>
          <p className="muted asp-hint">
            The big decisions still unresolved. The sparring partner asks whether your weeks are moving them.
          </p>
        </div>
        {a.questions.map((q, i) => (
          <div key={i} className="asp-row">
            <span className="asp-num mono" aria-hidden="true">?</span>
            <input
              className="input"
              aria-label={`Open question ${i + 1}`}
              maxLength={240}
              value={q}
              placeholder="A decision you keep postponing"
              onChange={(e) => setA((x) => ({ ...x, questions: x.questions.map((y, j) => (j === i ? e.target.value : y)) }))}
            />
            <button
              type="button"
              className="btn ghost small"
              aria-label={`Remove open question ${i + 1}`}
              onClick={() => setA((x) => ({ ...x, questions: x.questions.filter((_, j) => j !== i) }))}
            >
              ✕
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="btn"
            disabled={a.questions.length >= LIMITS.questions}
            onClick={() => setA((x) => ({ ...x, questions: [...x.questions, ""] }))}
          >
            {a.questions.length >= LIMITS.questions ? "Five is plenty. Answer one first" : "+ Add question"}
          </button>
        </div>
      </section>

      {a.foundations.length ? (
        <section className="stack" aria-labelledby="asp-cov-h">
          <div className="spread">
            <h2 id="asp-cov-h">{quarterLabel}: one objective per foundation</h2>
            <Link href="/app/objectives" className="btn small">Objectives</Link>
          </div>
          <ul className="asp-coverage">
            {a.foundations.map((f, i) => (
              <li key={f.id}>
                <span className="asp-cov-name">{f.name.trim() || `Foundation ${i + 1}`}</span>
                {coverage[f.id] ? (
                  <span className="asp-cov-obj">{coverage[f.id]}</span>
                ) : (
                  <span className="chip watch">No objective</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
