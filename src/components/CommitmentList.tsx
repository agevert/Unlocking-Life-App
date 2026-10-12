"use client";

import { useOptimistic, useTransition } from "react";
import { setCommitmentDone } from "@/lib/actions";
import type { Commitment, Objective } from "@/lib/schemas";
import { useToast } from "./Toast";

export function krLookup(objectives: Pick<Objective, "key_results">[]) {
  const map = new Map<string, string>();
  for (const o of objectives) for (const k of o.key_results) map.set(k.id, k.title || "Untitled key result");
  return map;
}

export function CommitmentList({
  week,
  items,
  objectives,
}: {
  week: string;
  items: Commitment[];
  objectives: Pick<Objective, "key_results">[];
}) {
  const krs = krLookup(objectives);
  const toast = useToast();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, u: { i: number; done: boolean }) =>
    state.map((c, i) => (i === u.i ? { ...c, done: u.done } : c)),
  );
  const done = optimistic.filter((c) => c.done).length;

  return (
    <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
      <ul className="commits">
        {optimistic.map((c, i) => {
          const id = `commit-${week}-${i}`;
          const kr = c.krId ? krs.get(c.krId) : null;
          return (
            <li key={id} className={`commit${c.done ? " done" : ""}`}>
              <input
                id={id}
                type="checkbox"
                checked={c.done}
                onChange={(e) => {
                  const next = e.target.checked;
                  start(async () => {
                    setOptimistic({ i, done: next });
                    const res = await setCommitmentDone(week, i, next);
                    if (!res.ok) toast(res.error);
                  });
                }}
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
        {done} of {optimistic.length} done
      </p>
    </div>
  );
}
