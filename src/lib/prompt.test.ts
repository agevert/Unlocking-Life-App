import { describe, expect, it } from "vitest";
import { buildSparringPrompt } from "./prompt";

describe("sparring prompt", () => {
  it("includes the numbers, the reflection and unlinked commitments", () => {
    const p = buildSparringPrompt({
      week: "2026-W42",
      pace: 0.2,
      quarterLabel: "Q4 2026",
      objectives: [
        {
          id: "o1", quarter: "2026-Q4", position: 0, title: "Win the region", why: "Board decision", created_at: "", updated_at: "",
          key_results: [{ id: "k1", title: "Buyer meetings", kind: "input", start: 0, current: 2, target: 10, unit: "meetings" }],
        },
      ],
      review: {
        week: "2026-W42", sparring: null, completed_at: "x", updated_at: "x",
        carried: [{ text: "Send proposal", krId: "k1", done: false }],
        reflection: { moved: "Two meetings", avoided: "Pricing call", lesson: "Ship it", energy: 3 },
        confidence: { o1: 5 },
        kr_values: { k1: 4 },
        next: [{ text: "Tidy CRM", krId: "", done: false }],
      },
      history: [],
    });
    expect(p).toContain("4 of 10 meetings");
    expect(p).toContain("40% of the way");
    expect(p).toContain("[not done] Send proposal");
    expect(p).toContain("Tidy CRM → KR: NOT LINKED");
    expect(p).toContain("Pricing call");
    expect(p).toContain("20% of the quarter");
  });
});
