"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveReview } from "@/lib/actions";
import { LIMITS } from "@/lib/config";
import { formatNumber } from "@/lib/okr";
import type { Commitment, Objective, Review, ReviewInput } from "@/lib/schemas";
import { formatDay } from "@/lib/week";
import { Sparring } from "./Sparring";
import { useToast } from "./Toast";

type SaveState = { state: "idle" | "saving" | "saved" | "error"; at?: string; error?: string };

function initialDraft(review: Review | null, carriedFrom: Commitment[], objectives: Objective[]): ReviewInput {
  const kr_values: Record<string, number | null> = {};
  for (const o of objectives) for (const k of o.key_results) kr_values[k.id] = k.current;
  return {
    carried: carriedFrom.length ? carriedFrom.map((c) => ({ ...c })) : review?.carried ?? [],
    reflection: review?.reflection ?? { moved: "", avoided: "", lesson: "", energy: 0 },
    confidence: { ...(review?.confidence ?? {}) },
    kr_values: { ...kr_values, ...(review?.kr_values ?? {}) },
    next: review?.next?.length ? review.next.map((n) => ({ ...n })) : [],
  };
}

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function ReviewForm(props: {
  week: string;
  weekNumber: number;
  range: string;
  quarterEnd: string;
  prevWeek: string;
  nextWeek: string | null;
  review: Review | null;
  carriedFrom: Commitment[];
  objectives: Objective[];
  priorConfidence: Record<string, number | null>;
  sparringEnabled: boolean;
}) {
  const { week, objectives } = props;
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<ReviewInput>(() => initialDraft(props.review, props.carriedFrom, objectives));
  const [completedAt, setCompletedAt] = useState<string | null>(props.review?.completed_at ?? null);
  const [save, setSave] = useState<SaveState>(
    props.review ? { state: "saved", at: props.review.updated_at } : { state: "idle" },
  );
  const [dirtySinceComplete, setDirtySinceComplete] = useState(false);
  const [completing, startComplete] = useTransition();
  const firstRender = useRef(true);
  const latest = useRef(draft);
  latest.current = draft;
  const inflight = useRef<Promise<unknown> | null>(null);
  const completedRef = useRef(completedAt);
  completedRef.current = completedAt;

  const krTitles = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of objectives) for (const k of o.key_results) m.set(k.id, k.title || "Untitled key result");
    return m;
  }, [objectives]);

  // ---- autosave (debounced) ----
  const persist = useCallback(async () => {
    setSave({ state: "saving" });
    const p = saveReview(week, latest.current, false);
    inflight.current = p;
    const res = await p;
    inflight.current = null;
    if (res.ok) setSave({ state: "saved", at: res.data.savedAt });
    else setSave({ state: "error", error: res.error });
  }, [week]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSave((s) => (s.state === "saving" ? s : { state: "saving" }));
    if (completedRef.current) setDirtySinceComplete(true);
    const t = setTimeout(persist, 900);
    return () => clearTimeout(t);
  }, [draft, persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save.state === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save.state]);

  // ---- complete ----
  const complete = useCallback(() => {
    startComplete(async () => {
      if (inflight.current) await inflight.current;
      const res = await saveReview(week, latest.current, true);
      if (!res.ok) {
        setSave({ state: "error", error: res.error });
        toast(res.error);
        return;
      }
      setCompletedAt(res.data.completedAt);
      setDirtySinceComplete(false);
      setSave({ state: "saved", at: res.data.savedAt });
      toast(completedAt ? "Review updated" : "Review complete. Now let it be challenged.");
      router.refresh();
      requestAnimationFrame(() => document.getElementById("sparring")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    });
  }, [week, toast, router, completedAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complete]);

  // ---- updaters ----
  const set = <K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setReflection = (patch: Partial<ReviewInput["reflection"]>) =>
    setDraft((d) => ({ ...d, reflection: { ...d.reflection, ...patch } }));

  const carriedDone = draft.carried.filter((c) => c.done).length;
  const unlinked = draft.next.filter((n) => n.text.trim() && !n.krId).length;
  const missingConfidence = objectives.filter((o) => !draft.confidence[o.id]).length;

  const statusText =
    save.state === "saving"
      ? "Saving…"
      : save.state === "error"
        ? save.error ?? "Couldn't save"
        : save.state === "saved" && save.at
          ? `Draft saved ${timeFmt.format(new Date(save.at))}`
          : "Changes save automatically";

  return (
    <div className="stack" style={{ "--gap": "18px" } as React.CSSProperties}>
      <div className="weeknav">
        <Link className="iconbtn" href={`/app/review/${props.prevWeek}`} aria-label="Previous week">‹</Link>
        <div>
          <div className="eyebrow">Weekly review</div>
          <h1>
            Week {props.weekNumber} <span className="muted">{props.range}</span>
          </h1>
        </div>
        <Link
          className="iconbtn"
          href={props.nextWeek ? `/app/review/${props.nextWeek}` : "#"}
          aria-label="Next week"
          aria-disabled={!props.nextWeek}
          tabIndex={props.nextWeek ? undefined : -1}
        >
          ›
        </Link>
        <span className={`chip ${completedAt ? "good" : ""}`}>
          {completedAt ? `Completed ${formatDay(completedAt.slice(0, 10))}` : props.review ? "Draft" : "Not started"}
        </span>
      </div>

      <ol className="steps">
        {/* 1 */}
        <li className="card step">
          <div className="step-head">
            <div>
              <h3>Did you do what you said?</h3>
              <p>The commitments you made at the end of last week. Tick only what is truly done.</p>
            </div>
          </div>
          {draft.carried.length ? (
            <>
              <ul className="commits">
                {draft.carried.map((c, i) => {
                  const id = `carried-${i}`;
                  const kr = c.krId ? krTitles.get(c.krId) : null;
                  return (
                    <li key={id} className={`commit${c.done ? " done" : ""}`}>
                      <input
                        id={id}
                        type="checkbox"
                        checked={c.done}
                        onChange={(e) =>
                          set("carried", draft.carried.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))
                        }
                      />
                      <label htmlFor={id}>
                        <span className="t">{c.text}</span>
                        {kr ? <span className="link">→ {kr}</span> : <span className="link off">Not linked to a key result</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mono muted" style={{ fontSize: "0.8rem" }}>
                {carriedDone} of {draft.carried.length} done
              </p>
            </>
          ) : (
            <p className="muted">No commitments were recorded for this week. From next week on, they will appear here.</p>
          )}
        </li>

        {/* 2 */}
        <li className="card step">
          <div className="step-head">
            <div>
              <h3>Update the numbers</h3>
              <p>
                Where each key result stands now, then how confident you are, out of 10, that you&apos;ll hit the objective by{" "}
                {formatDay(props.quarterEnd)}.
              </p>
            </div>
          </div>
          {!objectives.length ? (
            <p className="muted">
              No objectives for this quarter yet. <Link href="/app/objectives">Set them first.</Link>
            </p>
          ) : (
            <div className="stack">
              {objectives.map((o) => {
                const prior = props.priorConfidence[o.id];
                const current = draft.confidence[o.id] ?? 0;
                return (
                  <div key={o.id} className="rv-obj">
                    <strong>{o.title || "Untitled objective"}</strong>
                    {o.key_results.map((k) => (
                      <div key={k.id} className="rv-kr">
                        <label htmlFor={`kv-${k.id}`}>{k.title || "Untitled key result"}</label>
                        <input
                          id={`kv-${k.id}`}
                          className="input"
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={draft.kr_values[k.id] ?? ""}
                          onChange={(e) =>
                            set("kr_values", {
                              ...draft.kr_values,
                              [k.id]: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                        <span className="of">
                          of {formatNumber(k.target)} {k.unit}
                        </span>
                      </div>
                    ))}
                    <div className="seg-ends">
                      <span id={`conf-${o.id}`}>Confidence</span>
                      <span className="mono">{prior ? `Last rating: ${prior}` : "First rating"}</span>
                    </div>
                    <div className="seg" role="radiogroup" aria-labelledby={`conf-${o.id}`}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={current === v}
                          onClick={() => set("confidence", { ...draft.confidence, [o.id]: v })}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </li>

        {/* 3 */}
        <li className="card step">
          <div className="step-head">
            <div>
              <h3>Reflect</h3>
              <p>Short and true beats long and flattering.</p>
            </div>
          </div>
          <label className="field">
            <span className="label">What actually moved a key result?</span>
            <span className="hint">Name the action and the number it changed. Activity that changed nothing goes in the next box.</span>
            <textarea className="input" value={draft.reflection.moved} onChange={(e) => setReflection({ moved: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">What did you avoid, and what was the real reason?</span>
            <span className="hint">The task you kept moving to tomorrow. Write the reason you wouldn&apos;t say out loud.</span>
            <textarea className="input" value={draft.reflection.avoided} onChange={(e) => setReflection({ avoided: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">What would you tell a founder in your position?</span>
            <span className="hint">Step outside and advise yourself the way you would advise someone you back.</span>
            <textarea className="input" value={draft.reflection.lesson} onChange={(e) => setReflection({ lesson: e.target.value })} />
          </label>
          <div className="field">
            <span className="label" id="energy-label">Energy this week</span>
            <div className="seg-ends">
              <span>1 = running on empty</span>
              <span>5 = sharp all week</span>
            </div>
            <div className="seg" role="radiogroup" aria-labelledby="energy-label">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={draft.reflection.energy === v}
                  onClick={() => setReflection({ energy: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </li>

        {/* 4 */}
        <li className="card step">
          <div className="step-head">
            <div>
              <h3>Commit to next week</h3>
              <p>At most three. Write each as an outcome you can check on Friday, and link it to the key result it moves.</p>
            </div>
          </div>
          <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
            {draft.next.map((n, i) => (
              <div key={i} className="nextrow">
                <label className="sr-only" htmlFor={`next-${i}`}>Commitment {i + 1}</label>
                <input
                  id={`next-${i}`}
                  className="input"
                  value={n.text}
                  maxLength={240}
                  placeholder="e.g. Term sheet draft sent to the seller"
                  onChange={(e) => set("next", draft.next.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
                <label className="sr-only" htmlFor={`next-kr-${i}`}>Key result for commitment {i + 1}</label>
                <select
                  id={`next-kr-${i}`}
                  className="input"
                  value={n.krId}
                  onChange={(e) => set("next", draft.next.map((x, j) => (j === i ? { ...x, krId: e.target.value } : x)))}
                >
                  <option value="">Not linked to a key result</option>
                  {objectives.map((o) => (
                    <optgroup key={o.id} label={o.title || "Untitled objective"}>
                      {o.key_results.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.title || "Untitled key result"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn ghost small"
                  aria-label={`Remove commitment ${i + 1}`}
                  onClick={() => set("next", draft.next.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {unlinked ? (
            <p className="warnline" role="status">
              {unlinked === 1 ? "One commitment isn't" : `${unlinked} commitments aren't`} linked to a key result. Fine for life
              admin, but ask whether it earns one of three slots.
            </p>
          ) : null}
          <div>
            <button
              type="button"
              className="btn"
              disabled={draft.next.length >= LIMITS.commitments}
              onClick={() => {
                set("next", [...draft.next, { text: "", krId: "", done: false }]);
                requestAnimationFrame(() => document.getElementById(`next-${draft.next.length}`)?.focus());
              }}
            >
              {draft.next.length >= LIMITS.commitments ? "Three is the limit" : "+ Add a commitment"}
            </button>
          </div>
        </li>
      </ol>

      <div className="savebar">
        <span className="status" data-state={save.state} aria-live="polite">
          {statusText}
        </span>
        <div className="row">
          {missingConfidence && !completedAt ? (
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              {missingConfidence} confidence {missingConfidence === 1 ? "rating" : "ratings"} missing
            </span>
          ) : null}
          <button
            type="button"
            className="btn primary"
            onClick={complete}
            disabled={completing || (Boolean(completedAt) && !dirtySinceComplete)}
            title="Ctrl/⌘ + Enter"
          >
            {completing ? "Saving…" : completedAt ? (dirtySinceComplete ? "Update review" : "Completed ✓") : "Complete review"}
          </button>
        </div>
      </div>

      {props.sparringEnabled ? (
        <Sparring week={week} initial={props.review?.sparring ?? null} enabled={Boolean(completedAt)} />
      ) : null}
    </div>
  );
}
