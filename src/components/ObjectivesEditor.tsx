"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createObjective, deleteObjective, updateObjective } from "@/lib/actions";
import { LIMITS } from "@/lib/config";
import { newId } from "@/lib/okr";
import type { KeyResult, Objective } from "@/lib/schemas";
import { useToast } from "./Toast";

export function ObjectivesEditor({ quarter, initial, readOnly }: { quarter: string; initial: Objective[]; readOnly: boolean }) {
  const [items, setItems] = useState(initial);
  const [adding, startAdd] = useTransition();
  const toast = useToast();

  const add = () =>
    startAdd(async () => {
      const res = await createObjective(quarter);
      if (!res.ok) return toast(res.error);
      setItems((x) => [...x, res.data]);
      requestAnimationFrame(() => document.getElementById(`title-${res.data.id}`)?.focus());
    });

  return (
    <div className="stack">
      {items.map((o, i) => (
        <ObjectiveEditorCard
          key={o.id}
          index={i}
          initial={o}
          readOnly={readOnly}
          onDeleted={() => setItems((x) => x.filter((y) => y.id !== o.id))}
        />
      ))}
      {!items.length ? (
        <p className="empty">
          {readOnly
            ? "No objectives were set for this quarter."
            : "Nothing set yet. Start with the one objective that would make the quarter a success on its own."}
        </p>
      ) : null}
      {!readOnly ? (
        <div>
          <button className="btn primary" onClick={add} disabled={adding || items.length >= LIMITS.objectives}>
            {items.length >= LIMITS.objectives ? "Three is the limit. Delete one to add another" : adding ? "Adding…" : "+ Add objective"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type SaveState = "saved" | "saving" | "error";

function ObjectiveEditorCard({
  index,
  initial,
  readOnly,
  onDeleted,
}: {
  index: number;
  initial: Objective;
  readOnly: boolean;
  onDeleted: () => void;
}) {
  const [o, setO] = useState(initial);
  const [state, setState] = useState<SaveState>("saved");
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const toast = useToast();
  const first = useRef(true);
  const latest = useRef(o);
  latest.current = o;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(async () => {
      const { title, why, key_results } = latest.current;
      const res = await updateObjective(latest.current.id, { title, why, key_results });
      if (res.ok) setState("saved");
      else {
        setState("error");
        toast(res.error);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [o, toast]);

  const setKr = (i: number, patch: Partial<KeyResult>) =>
    setO((x) => ({ ...x, key_results: x.key_results.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <article className="card stack appear" aria-labelledby={`title-${o.id}`}>
      <div className="spread">
        <span className="eyebrow">Objective {index + 1}</span>
        <span className="status" data-state={state} aria-live="polite">
          {state === "saving" ? "Saving…" : state === "error" ? "Not saved" : "Saved"}
        </span>
      </div>
      <label className="field">
        <span className="label">Objective</span>
        <input
          id={`title-${o.id}`}
          className="input"
          value={o.title}
          maxLength={200}
          disabled={readOnly}
          placeholder="A direction worth a quarter"
          onChange={(e) => setO({ ...o, title: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="label">Why it matters now</span>
        <input
          className="input"
          value={o.why}
          maxLength={400}
          disabled={readOnly}
          placeholder="One sentence. If you can't write it, drop the objective."
          onChange={(e) => setO({ ...o, why: e.target.value })}
        />
      </label>

      <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
        {o.key_results.map((k, i) => (
          <div key={k.id} className="ed-kr">
            <label className="krt">
              Key result {i + 1}
              <input className="input" value={k.title} maxLength={200} disabled={readOnly} placeholder="Measurable outcome" onChange={(e) => setKr(i, { title: e.target.value })} />
            </label>
            <label className="krkind">
              Type
              <select className="input" value={k.kind} disabled={readOnly} onChange={(e) => setKr(i, { kind: e.target.value as KeyResult["kind"] })}>
                <option value="outcome">Outcome</option>
                <option value="input">Input</option>
              </select>
            </label>
            <label>
              Start
              <input className="input" type="number" step="any" inputMode="decimal" value={k.start} disabled={readOnly} onChange={(e) => setKr(i, { start: num(e.target.value) })} />
            </label>
            <label>
              Now
              <input className="input" type="number" step="any" inputMode="decimal" value={k.current} disabled={readOnly} onChange={(e) => setKr(i, { current: num(e.target.value) })} />
            </label>
            <label>
              Target
              <input className="input" type="number" step="any" inputMode="decimal" value={k.target} disabled={readOnly} onChange={(e) => setKr(i, { target: num(e.target.value) })} />
            </label>
            <label>
              Unit
              <input className="input" value={k.unit} maxLength={24} disabled={readOnly} placeholder="deals" onChange={(e) => setKr(i, { unit: e.target.value })} />
            </label>
            {!readOnly ? (
              <button
                type="button"
                className="btn ghost small krx"
                aria-label={`Remove key result ${i + 1}`}
                onClick={() => setO((x) => ({ ...x, key_results: x.key_results.filter((_, j) => j !== i) }))}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {!readOnly ? (
        <div className="spread" style={{ alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            disabled={o.key_results.length >= LIMITS.keyResults}
            onClick={() =>
              setO((x) => ({
                ...x,
                key_results: [...x.key_results, { id: newId(), title: "", kind: "outcome", start: 0, current: 0, target: 0, unit: "" }],
              }))
            }
          >
            {o.key_results.length >= LIMITS.keyResults ? "Four key results max" : "+ Add key result"}
          </button>
          {confirming ? (
            <div className="row" role="group" aria-label="Confirm delete">
              <span className="muted" style={{ fontSize: "0.88rem" }}>Delete this objective for good?</span>
              <button type="button" className="btn small" onClick={() => setConfirming(false)}>Keep</button>
              <button
                type="button"
                className="btn small danger solid"
                disabled={deleting}
                onClick={() =>
                  startDelete(async () => {
                    const res = await deleteObjective(o.id);
                    if (!res.ok) return toast(res.error);
                    toast("Objective deleted");
                    onDeleted();
                  })
                }
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost danger" onClick={() => setConfirming(true)}>Delete objective</button>
          )}
        </div>
      ) : null}
    </article>
  );
}
