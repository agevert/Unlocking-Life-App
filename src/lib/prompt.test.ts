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
          id: "o1", quarter: "2026-Q4", position: 0, title: "Win the region", why: "Board decision", foundation: null, created_at: "", updated_at: "",
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
    expect(p).not.toContain("<aspiration>");
    expect(p).not.toContain("Long game:");
  });

  it("holds the week against the aspiration when there is one", () => {
    const objective = (id: string, title: string, foundation: string | null) => ({
      id, quarter: "2026-Q4", position: 0, title, why: "", foundation, created_at: "", updated_at: "", key_results: [],
    });
    const p = buildSparringPrompt({
      week: "2026-W42",
      pace: 0.2,
      quarterLabel: "Q4 2026",
      objectives: [objective("o1", "Run the Lisbon marathon", "f1"), objective("o2", "Close two deals", "gone")],
      review: {
        week: "2026-W42", sparring: null, completed_at: "x", updated_at: "x", carried: [], next: [],
        reflection: { moved: "", avoided: "", lesson: "", energy: 0 }, confidence: {}, kr_values: {},
      },
      history: [],
      aspiration: {
        horizon_year: 2036,
        vision: "In Chile with my family, after an exit.",
        foundations: [
          { id: "f1", name: "Body and mind" },
          { id: "f2", name: "Community, family and friends" },
          { id: "f3", name: "" },
        ],
        questions: ["Search or build?", "  "],
        updated_at: null,
      },
    });
    expect(p).toContain("<aspiration>");
    expect(p).toContain("Horizon: 2036");
    expect(p).toContain("Vision: In Chile with my family, after an exit.");
    expect(p).toContain("1. Body and mind: Run the Lisbon marathon");
    expect(p).toContain("2. Community, family and friends: NO OBJECTIVE THIS QUARTER");
    expect(p).toContain("3. Foundation 3: NO OBJECTIVE THIS QUARTER");
    expect(p).toContain("- Search or build?");
    expect(p).toContain("Objective: Run the Lisbon marathon [foundation: Body and mind]");
    expect(p).toContain("Objective: Close two deals [foundation: not linked]");
    expect(p).toContain("Long game:");
  });

  it("ignores an aspiration with nothing written in it", () => {
    const p = buildSparringPrompt({
      week: "2026-W42", pace: 0.2, quarterLabel: "Q4 2026", objectives: [], history: [],
      review: {
        week: "2026-W42", sparring: null, completed_at: "x", updated_at: "x", carried: [], next: [],
        reflection: { moved: "", avoided: "", lesson: "", energy: 0 }, confidence: {}, kr_values: {},
      },
      aspiration: { horizon_year: 2036, vision: " ", foundations: [{ id: "f1", name: "" }], questions: [], updated_at: null },
    });
    expect(p).not.toContain("<aspiration>");
  });
});
