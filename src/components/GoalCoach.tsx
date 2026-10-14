"use client";

import { useEffect, useRef, useState } from "react";
import { createCoachedObjective } from "@/lib/actions";
import { goalCoachResponseSchema, goalProposalSchema, type CoachMessage, type GoalProposal } from "@/lib/goal-coach";
import type { Foundation, Objective } from "@/lib/schemas";
import { quarterLabel } from "@/lib/week";
import { useToast } from "./Toast";

type InterviewRequest = {
  messages: CoachMessage[];
  intent: "continue" | "propose";
  proposal: GoalProposal | null;
  input: string;
};

const OPENING = "What do you want to become capable of, achieve, or change this quarter?";
const PROPOSE_REQUEST = "Please propose a goal from what we have discussed so far.";
const MAX_MESSAGES = 24;
const MAX_TRANSCRIPT = 32000;

export function GoalCoach({
  quarter,
  foundations,
  takenFoundations,
  active,
  canCreate,
  onBusyChange,
  onClose,
  onCreated,
}: {
  quarter: string;
  foundations: Foundation[];
  takenFoundations: Record<string, number>;
  active: boolean;
  canCreate: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onCreated: (objective: Objective) => void;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<GoalProposal | null>(null);
  const [view, setView] = useState<"interview" | "proposal">("interview");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"coaching" | "proposing" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<InterviewRequest | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const proposalHeading = useRef<HTMLHeadingElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);
  const requestAbort = useRef<AbortController | null>(null);
  const acceptanceId = useRef<string | null>(null);
  const toast = useToast();
  const answerCount = messages.filter((message) => message.role === "user").length;
  const transcriptLength = messages.reduce((length, message) => length + message.content.length, 0);
  const answerLimit = Math.max(0, Math.min(4000, MAX_TRANSCRIPT - transcriptLength));
  const atLimit = messages.length >= MAX_MESSAGES || answerLimit < PROPOSE_REQUEST.length;
  const lastTurn = messages.length >= MAX_MESSAGES - 2;

  useEffect(() => {
    if (!active) return;
    if (view === "interview") composer.current?.focus();
    else proposalHeading.current?.focus();
  }, [active, view]);

  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    onBusyChange(busy !== null);
  }, [busy, onBusyChange]);

  useEffect(() => () => requestAbort.current?.abort(), []);

  const runInterview = async (request: InterviewRequest) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(request.intent === "propose" ? "proposing" : "coaching");
    setError(null);
    setFailedRequest(null);
    const controller = new AbortController();
    requestAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch("/api/goals/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ quarter, messages: request.messages, intent: request.intent, proposal: request.proposal }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "The coach is unavailable right now. Your interview is still here.");
      const parsed = goalCoachResponseSchema.safeParse(body);
      if (!parsed.success || (request.intent === "propose" && !parsed.data.proposal)) {
        throw new Error("The coach returned an incomplete response. Please try again.");
      }
      const nextProposal = parsed.data.proposal;
      setMessages([...request.messages, { role: "assistant", content: parsed.data.reply }]);
      // Dictation may still be finishing. Only clear the answer that was sent.
      setInput((current) => current === request.input ? "" : current);
      if (nextProposal) {
        setProposal(nextProposal);
        setEditing(false);
        setView("proposal");
      }
    } catch (cause) {
      setError(controller.signal.aborted ? "The coach took too long to respond. Your interview is still here; try again." : cause instanceof Error ? cause.message : "The coach could not respond. Please try again.");
      setFailedRequest(request);
    } finally {
      window.clearTimeout(timeout);
      requestAbort.current = null;
      requestInFlight.current = false;
      setBusy(null);
    }
  };

  const send = (intent: "continue" | "propose") => {
    if (busy || atLimit) return;
    const content = input.trim() || (intent === "propose" ? PROPOSE_REQUEST : "");
    if (!content || content.length > answerLimit) return;
    void runInterview({
      messages: [...messages, { role: "user", content }],
      intent: lastTurn ? "propose" : intent,
      proposal,
      input,
    });
  };

  const accept = async () => {
    if (requestInFlight.current || !proposal || !canCreate) return;
    const parsed = goalProposalSchema.safeParse(proposal);
    if (!parsed.success) {
      setError(`Check the proposal: ${parsed.error.issues[0]?.message || "Complete every field."}`);
      setEditing(true);
      return;
    }
    requestInFlight.current = true;
    setBusy("saving");
    setError(null);
    setFailedRequest(null);
    acceptanceId.current ??= crypto.randomUUID();
    try {
      const result = await createCoachedObjective(quarter, parsed.data, acceptanceId.current);
      if (!result.ok) throw new Error(result.error);
      toast("Goal created");
      onCreated(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your goal could not be saved. Please try accepting again.");
    } finally {
      requestInFlight.current = false;
      setBusy(null);
    }
  };

  const keepCoaching = () => {
    const parsed = goalProposalSchema.safeParse(proposal);
    if (!parsed.success) {
      setEditing(true);
      setError(`Complete your draft before continuing: ${parsed.error.issues[0]?.message || "Check every field."}`);
      return;
    }
    setView("interview");
    setEditing(false);
    setError(null);
    setFailedRequest(null);
  };

  return (
    <section className="goal-coach stack" aria-labelledby="goal-coach-title" aria-busy={busy !== null}>
      <div className="spread goal-coach-header">
        <div>
          <div className="eyebrow">Goal Coach · {quarterLabel(quarter)}</div>
          <h2 id="goal-coach-title">Talk it through. Build your OKR.</h2>
        </div>
        <button type="button" className="btn ghost small" disabled={busy !== null} onClick={onClose}>Close interview</button>
      </div>
      <p className="muted goal-coach-context">The coach draws on your saved vision, foundations, goals, reviews and evidence where available. Expect 5–8 focused questions. You review the proposal before anything is saved.</p>

      <div ref={transcript} className="goal-coach-transcript" role="log" aria-label="Goal coaching conversation" aria-live="polite" aria-relevant="additions">
        <div className="goal-coach-message assistant">
          <span className="eyebrow">Coach</span>
          <p>{OPENING}</p>
        </div>
        {messages.map((message, index) => (
          <div key={index} className={`goal-coach-message ${message.role}`}>
            <span className="eyebrow">{message.role === "user" ? "You" : "Coach"}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {busy === "coaching" || busy === "proposing" ? (
          <div className="goal-coach-message assistant" role="status">
            <p>{busy === "proposing" ? "Turning your answers into a proposal…" : "Thinking through your answer…"}</p>
          </div>
        ) : null}
      </div>

      {view === "interview" ? (
        <div className="stack">
          {proposal ? (
            <div className="goal-coach-draft-notice spread">
              <span>Your current proposal is kept as context while you coach further.</span>
              <button type="button" className="btn small" disabled={busy !== null} onClick={() => setView("proposal")}>Review proposal</button>
            </div>
          ) : null}
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              send("continue");
            }}
          >
            <label className="field">
              <span className="label">Your answer</span>
              <textarea
                ref={composer}
                aria-label="Your answer"
                className="input goal-coach-answer"
                value={input}
                maxLength={answerLimit}
                disabled={busy !== null || atLimit}
                aria-describedby="goal-coach-voice-hint"
                placeholder={proposal ? "What would you like to change or explore further?" : "Talk to me as you would to a coach. It does not need to be perfectly worded."}
                onChange={(event) => setInput(event.target.value.slice(0, answerLimit))}
              />
            </label>
            <p className="hint" id="goal-coach-voice-hint">Type your answer, or focus this field and use Speak if your browser supports voice dictation. Review your words, then send.</p>
            <div className="spread goal-coach-actions">
              <button type="submit" className="btn primary" disabled={!input.trim() || busy !== null || atLimit}>
                {busy === "coaching" ? "Coaching…" : lastTurn ? "Send & propose goal" : "Send answer"}
              </button>
              {answerCount >= 2 ? (
                <button type="button" className="btn" disabled={busy !== null || atLimit} onClick={() => send("propose")}>
                  {busy === "proposing" ? "Proposing…" : input.trim() ? "Send & propose goal" : "Propose my goal"}
                </button>
              ) : <span className="hint">First, explore the capability and what would count as evidence.</span>}
            </div>
          </form>
          {atLimit ? <p className="notice">This interview has reached its length limit. You can review your proposal or close it and build a goal manually.</p> : null}
        </div>
      ) : proposal ? (
        <div className="goal-proposal stack" aria-labelledby="goal-proposal-title">
          <div className="spread">
            <div>
              <div className="eyebrow">Your proposal · not saved</div>
              <h3 id="goal-proposal-title" ref={proposalHeading} tabIndex={-1}>A goal you can prove.</h3>
            </div>
            {editing ? <span className="hint">Edits stay in this draft until you accept.</span> : null}
          </div>
          <ProposalFields
            proposal={proposal}
            foundations={foundations}
            takenFoundations={takenFoundations}
            editing={editing}
            disabled={busy !== null}
            onChange={setProposal}
          />
          {!canCreate ? <p className="notice">Three goals is the limit. Delete an existing goal before accepting this proposal.</p> : null}
          <div className="row goal-coach-actions">
            <button type="button" className="btn" disabled={busy !== null || atLimit} onClick={keepCoaching}>Keep coaching</button>
            <button type="button" className="btn" disabled={busy !== null} onClick={() => setEditing(!editing)}>{editing ? "Review edits" : "Edit proposal"}</button>
            <button type="button" className="btn primary" disabled={busy !== null || !canCreate} onClick={() => void accept()}>{busy === "saving" ? "Creating goal…" : "Accept & create goal"}</button>
          </div>
          <p className="hint">Accepting creates this objective and its key results. You can keep editing them in Goals afterwards.</p>
        </div>
      ) : null}

      {error ? (
        <div className="goal-coach-error stack" role="alert">
          <p className="error">{error}</p>
          {failedRequest ? <button type="button" className="btn small" disabled={busy !== null} onClick={() => void runInterview(failedRequest)}>{failedRequest.intent === "propose" ? "Retry proposal request" : "Retry previous answer"}</button> : null}
        </div>
      ) : null}
    </section>
  );
}

function ProposalFields({
  proposal,
  foundations,
  takenFoundations,
  editing,
  disabled,
  onChange,
}: {
  proposal: GoalProposal;
  foundations: Foundation[];
  takenFoundations: Record<string, number>;
  editing: boolean;
  disabled: boolean;
  onChange: (proposal: GoalProposal) => void;
}) {
  const foundationIndex = foundations.findIndex((foundation) => foundation.id === proposal.foundation);
  const foundationName = foundationIndex >= 0 ? foundations[foundationIndex].name.trim() || `Foundation ${foundationIndex + 1}` : "Not linked";
  const setKr = (index: number, patch: Partial<GoalProposal["key_results"][number]>) =>
    onChange({ ...proposal, key_results: proposal.key_results.map((result, i) => i === index ? { ...result, ...patch } : result) });
  const num = (value: string) => value === "" ? 0 : Number(value);

  return (
    <>
      {editing ? (
        <>
          <label className="field">
            <span className="label">Objective</span>
            <textarea aria-label="Objective" className="input" value={proposal.title} maxLength={200} disabled={disabled} onChange={(event) => onChange({ ...proposal, title: event.target.value })} />
          </label>
          <label className="field">
            <span className="label">Why it matters now</span>
            <textarea aria-label="Why it matters now" className="input" value={proposal.why} maxLength={400} disabled={disabled} onChange={(event) => onChange({ ...proposal, why: event.target.value })} />
          </label>
          {foundations.length ? (
            <label className="field">
              <span className="label">Serves foundation</span>
              <select className="input" value={proposal.foundation ?? ""} disabled={disabled} onChange={(event) => onChange({ ...proposal, foundation: event.target.value || null })}>
                <option value="">Not linked</option>
                {foundations.map((foundation, index) => <option key={foundation.id} value={foundation.id} disabled={!!takenFoundations[foundation.id]}>{foundation.name.trim() || `Foundation ${index + 1}`}{takenFoundations[foundation.id] ? ` (goal ${takenFoundations[foundation.id]})` : ""}</option>)}
              </select>
            </label>
          ) : null}
        </>
      ) : (
        <div className="stack goal-proposal-summary">
          <div><span className="eyebrow">Objective</span><h4>{proposal.title}</h4></div>
          <div><span className="eyebrow">Why it matters now</span><p>{proposal.why}</p></div>
          <div><span className="eyebrow">Serves foundation</span><p>{foundationName}</p></div>
        </div>
      )}

      <div className="stack">
        <div><span className="eyebrow">Key results · observable evidence</span><p className="hint">The starting value becomes your initial progress. Outcomes show what changes; inputs support the practice.</p></div>
        {proposal.key_results.map((result, index) => editing ? (
          <div key={index} className="goal-proposal-kr-edit">
            <label className="field goal-proposal-kr-title"><span className="label">Key result {index + 1}</span><input className="input" value={result.title} maxLength={200} disabled={disabled} onChange={(event) => setKr(index, { title: event.target.value })} /></label>
            <label className="field"><span className="label">Type</span><select className="input" value={result.kind} disabled={disabled} onChange={(event) => setKr(index, { kind: event.target.value as "outcome" | "input" })}><option value="outcome">Outcome</option><option value="input">Input</option></select></label>
            <label className="field"><span className="label">Start</span><input className="input" type="number" step="any" inputMode="decimal" value={result.start} disabled={disabled} onChange={(event) => setKr(index, { start: num(event.target.value) })} /></label>
            <label className="field"><span className="label">Target</span><input className="input" type="number" step="any" inputMode="decimal" value={result.target} disabled={disabled} onChange={(event) => setKr(index, { target: num(event.target.value) })} /></label>
            <label className="field"><span className="label">Unit</span><input className="input" value={result.unit} maxLength={24} disabled={disabled} onChange={(event) => setKr(index, { unit: event.target.value })} /></label>
            {proposal.key_results.length > 3 ? <button type="button" className="btn ghost small" disabled={disabled} aria-label={`Remove key result ${index + 1}`} onClick={() => onChange({ ...proposal, key_results: proposal.key_results.filter((_, i) => i !== index) })}>Remove</button> : null}
          </div>
        ) : (
          <div key={index} className="goal-proposal-kr">
            <span className="eyebrow">Key result {index + 1} · {result.kind}</span>
            <strong>{result.title}</strong>
            <span className="goal-proposal-measure">{result.start} → {result.target} {result.unit}</span>
          </div>
        ))}
        {editing && proposal.key_results.length < 4 ? <button type="button" className="btn small goal-proposal-add" disabled={disabled} onClick={() => onChange({ ...proposal, key_results: [...proposal.key_results, { title: "", kind: "outcome", start: 0, target: 1, unit: "" }] })}>+ Add key result</button> : null}
      </div>

      <div className="goal-coaching-plan">
        {editing ? (
          <>
            <label className="field"><span className="label">Current bottleneck</span><textarea aria-label="Current bottleneck" className="input" value={proposal.bottleneck} maxLength={1000} disabled={disabled} onChange={(event) => onChange({ ...proposal, bottleneck: event.target.value })} /></label>
            <label className="field"><span className="label">First deliberate practice</span><textarea aria-label="First deliberate practice" className="input" value={proposal.first_practice} maxLength={1000} disabled={disabled} onChange={(event) => onChange({ ...proposal, first_practice: event.target.value })} /></label>
          </>
        ) : (
          <>
            <div className="goal-coaching-note"><span className="eyebrow">Current bottleneck</span><p>{proposal.bottleneck}</p></div>
            <div className="goal-coaching-note"><span className="eyebrow">First deliberate practice</span><p>{proposal.first_practice}</p></div>
          </>
        )}
      </div>
    </>
  );
}
