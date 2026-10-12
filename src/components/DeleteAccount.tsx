"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="card stack" aria-labelledby="delete-title">
      <h2 id="delete-title">Delete account</h2>
      <p className="muted">
        This permanently deletes your account, objectives and every review. It can&apos;t be undone. Download your data first if
        you want to keep it.
      </p>
      {!open ? (
        <div><button className="btn danger" onClick={() => setOpen(true)}>Delete my account…</button></div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await deleteAccount(text);
              if (res && !res.ok) setError(res.error);
            });
          }}
        >
          <label className="field">
            <span className="label">Type DELETE to confirm</span>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoFocus />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="row">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn danger solid" disabled={pending || text.trim().toUpperCase() !== "DELETE"}>
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
