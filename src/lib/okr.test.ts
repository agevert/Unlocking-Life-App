import { describe, expect, it } from "vitest";
import { krProgress, krStatus, latestConfidence, logStats } from "./okr";
import { safeNext } from "./safe-next";
import type { Review } from "./schemas";

describe("key result progress", () => {
  it("measures from start to target", () => {
    expect(krProgress({ start: 0, current: 5, target: 20 })).toBe(0.25);
    expect(krProgress({ start: 6, current: 5.5, target: 5 })).toBe(0.5);
    expect(krProgress({ start: 0, current: 40, target: 20 })).toBe(1);
    expect(krProgress({ start: 0, current: -3, target: 20 })).toBe(0);
    expect(krProgress({ start: 0, current: 0, target: 0 })).toBe(0);
  });
  it("compares progress with the pace of the quarter", () => {
    expect(krStatus(1, 0.5)).toBe("hit");
    expect(krStatus(0.45, 0.5)).toBe("on-pace");
    expect(krStatus(0.3, 0.5)).toBe("watch");
    expect(krStatus(0.1, 0.5)).toBe("behind");
    expect(krStatus(0, 0.13)).toBe("watch");
  });
});

describe("history", () => {
  const reviews: Pick<Review, "week" | "confidence">[] = [
    { week: "2026-W41", confidence: { a: 6 } },
    { week: "2026-W43", confidence: { a: 4 } },
    { week: "2026-W42", confidence: {} },
  ];
  it("finds the latest confidence, optionally before a week", () => {
    expect(latestConfidence(reviews, "a")?.value).toBe(4);
    expect(latestConfidence(reviews, "a", "2026-W43")?.value).toBe(6);
    expect(latestConfidence(reviews, "b")).toBeNull();
  });
  it("summarises completed reviews only", () => {
    const base = { reflection: { moved: "", avoided: "", lesson: "", energy: 4 } };
    const s = logStats([
      { ...base, completed_at: "x", carried: [{ text: "a", krId: "", done: true }, { text: "b", krId: "", done: false }], next: [{ text: "c", krId: "k", done: false }] },
      { ...base, completed_at: null, carried: [{ text: "z", krId: "", done: true }], next: [] },
    ]);
    expect(s.followThrough).toEqual({ done: 1, total: 2 });
    expect(s.linked).toEqual({ linked: 1, total: 1 });
    expect(s.averageEnergy).toBe(4);
    expect(s.reviewed).toBe(1);
  });
});

describe("redirect safety", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/app/log")).toBe("/app/log");
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("/\\evil.com")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});
