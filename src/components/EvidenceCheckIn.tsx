"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvidence } from "@/lib/actions";
import type { Objective } from "@/lib/schemas";
import { useToast } from "./Toast";

const TYPES = [
  { value: "practice", label: "Practice" },
  { value: "experiment", label: "Experiment" },
  { value: "real_world", label: "Real-world test" },
] as const;

export function EvidenceCheckIn({ objectives }: { objectives: Objective[] }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [kind, setKind] = useState<(typeof TYPES)[number]["value"]>("practice");
  const [objectiveId, setObjectiveId] = useState("");
  const [krId, setKrId] = useState("");
  const [practice, setPractice] = useState("");
  const [evidence, setEvidence] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nextPractice, setNextPractice] = useState<string | null>(null);
  const [coaching, setCoaching] = useState(false);

  const selected = useMemo(() => objectives.find((o) => o.id === objectiveId) ?? null, [objectives, objectiveId]);
  const canSave = practice.trim().length > 0 && evidence.trim().length > 0 && !saving;

  const reset = () => {
    setPractice("");
    setEvidence("");
    setDifficulty(3);
  };

  const save = () =>
    startSaving(async () => {
      setFeedback(null);
      setNextPractice(null);
      const res = await createEvidence({
        objective_id: objectiveId || null,
        kr_id: krId,
        kind,
        practice,
        evidence,
        difficulty,
      });
      if (!res.ok) return toast(res.error);

      toast("Evidence saved");
      reset();
      router.refresh();

      setCoaching(true);
      try {
        const response = await fetch("/api/evidence/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: res.data.id }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Coach feedback is unavailable right now.");
        setFeedback(body.feedback ?? null);
        setNextPractice(body.next_practice ?? null);
        router.refresh();
      } catch (e) {
        toast((e as Error).message);
      } finally {
        setCoaching(false);
      }
    });

  return (
    <section id="check-in" className="checkin-card stack" aria-labelledby="checkin-title">
      <div className="spread checkin-head">
        <div>
          <div className="eyebrow">3-minute check-in</div>
          <h1 id="checkin-title">Turn practice into evidence.</h1>
        </div>
        <span className="coach-pill">Evidence</span>
      </div>

      <div className="field">
        <span className="label">What kind of rep was this?</span>
        <div className="choice-row" role="radiogroup" aria-label="Evidence type">
          {TYPES.map((x) => (
            <button key={x.value} type="button" className="choice-chip" aria-pressed={kind === x.value} onClick={() => setKind(x.value)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="evidence-link-grid">
        <label className="field">
          <span className="label">Goal</span>
          <select
            className="input"
            value={objectiveId}
            onChange={(e) => {
              setObjectiveId(e.target.value);
              setKrId("");
            }}
          >
            <option value="">Not linked</option>
            {objectives.map((o) => <option key={o.id} value={o.id}>{o.title || "Untitled goal"}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Key result</span>
          <select className="input" value={krId} disabled={!selected} onChange={(e) => setKrId(e.target.value)}>
            <option value="">Not linked</option>
            {selected?.key_results.map((k) => <option key={k.id} value={k.id}>{k.title || "Untitled key result"}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">What did you practice, test or do?</span>
        <span className="hint">Describe the rep, not the intention.</span>
        <textarea
          className="input"
          value={practice}
          maxLength={1000}
          placeholder="e.g. Rebuilt the onboarding flow from scratch and forced myself to remove one decision from every screen."
          onChange={(e) => setPractice(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">Evidence, not effort</span>
        <span className="hint">What is observably different now? What can you do, show or measure that you could not before?</span>
        <textarea
          className="input evidence-textarea"
          value={evidence}
          maxLength={4000}
          placeholder="e.g. Reduced the flow from 7 decisions to 4 and could defend each removal using cognitive-load principles."
          onChange={(e) => setEvidence(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="label" id="difficulty-label">How demanding was the rep?</span>
        <div className="difficulty-row" role="radiogroup" aria-labelledby="difficulty-label">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" aria-checked={difficulty === v} role="radio" onClick={() => setDifficulty(v)}>{v}</button>
          ))}
        </div>
      </div>

      <div className="coach-check">
        <span className="eyebrow">Coach check</span>
        <strong>If you cannot point to evidence, the practice probably is not finished.</strong>
      </div>

      <button type="button" className="btn primary checkin-save" disabled={!canSave} onClick={save}>
        {saving ? "Saving…" : "Save evidence"}
      </button>

      {coaching ? <div className="coach-feedback loading">Coach is looking for the capability signal and next bottleneck…</div> : null}
      {feedback || nextPractice ? (
        <div className="coach-feedback stack">
          <div>
            <div className="eyebrow">Coach feedback</div>
            <h2>Here&apos;s what actually improved.</h2>
          </div>
          {feedback ? <p>{feedback}</p> : null}
          {nextPractice ? (
            <div className="next-practice">
              <span className="eyebrow">Next deliberate practice</span>
              <strong>{nextPractice}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
