import { STATUS_LABEL, formatNumber, krProgress, krStatus } from "@/lib/okr";
import type { KeyResult } from "@/lib/schemas";

export function KrRow({ kr, pace }: { kr: KeyResult; pace: number }) {
  const p = krProgress(kr);
  const status = krStatus(p, pace);
  return (
    <div className="kr">
      <div className="kr-name">
        <span className="kind">{kr.kind === "input" ? "Input" : "Outcome"}</span>
        {kr.title || "Untitled key result"}
      </div>
      <div className="kr-meter">
        <div
          className="bar"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p * 100)}
          aria-label={`${kr.title || "Key result"} progress`}
        >
          <div className="fill" style={{ width: `${(p * 100).toFixed(1)}%` }} />
          <div className="tick" style={{ left: `calc(${(pace * 100).toFixed(1)}% - 1px)` }} title="Where linear progress would be today" />
        </div>
        <div className="kr-val">
          <b>{formatNumber(kr.current)}</b> / {formatNumber(kr.target)} {kr.unit} · from {formatNumber(kr.start)}
        </div>
      </div>
      <span className={`chip ${status}`}>{STATUS_LABEL[status]}</span>
    </div>
  );
}
