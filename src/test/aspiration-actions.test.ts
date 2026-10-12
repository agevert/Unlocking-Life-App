import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, has, type Resolver } from "./fake-supabase";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));

const USER = { id: "11111111-1111-1111-1111-111111111111", email: "a@x.com" };

function signedIn(resolve: Resolver) {
  const fake = fakeSupabase(resolve, { getUser: async () => ({ data: { user: USER } }) });
  state.client = fake.client;
  return fake;
}

const load = async () => await import("@/lib/actions");

beforeEach(() => vi.resetModules());

describe("saveAspiration", () => {
  it("trims, drops blank questions and untags objectives whose foundation was removed", async () => {
    const fake = signedIn((c) => (c.table === "aspirations" ? { data: { updated_at: "2026-10-12T20:00:00Z" } } : {}));
    const res = await (await load()).saveAspiration({
      horizon_year: 2036,
      vision: "Chile.",
      foundations: [{ id: "f1", name: " Body and mind " }, { id: "f2", name: "" }],
      questions: [" Search or build? ", "   "],
    });
    expect(res).toEqual({ ok: true, data: { savedAt: "2026-10-12T20:00:00Z" } });

    const upsert = fake.calls.find((c) => c.table === "aspirations" && has(c, "upsert"));
    expect(upsert?.ops[0].args[0]).toEqual({
      user_id: USER.id,
      horizon_year: 2036,
      vision: "Chile.",
      foundations: [{ id: "f1", name: "Body and mind" }, { id: "f2", name: "" }],
      questions: ["Search or build?"],
    });

    const untag = fake.calls.find((c) => c.table === "objectives" && has(c, "update"));
    expect(untag?.ops[0].args[0]).toEqual({ foundation: null });
    expect(untag?.ops.filter((o) => o.op === "not").map((o) => o.args)).toEqual([
      ["foundation", "is", null],
      ["foundation", "in", '("f1","f2")'],
    ]);
  });

  it("rejects foundation ids that could break the filter", async () => {
    signedIn(() => ({}));
    const res = await (await load()).saveAspiration({
      horizon_year: null, vision: "", foundations: [{ id: 'x"),(y', name: "Bad" }], questions: [],
    });
    expect(res.ok).toBe(false);
  });
});

describe("setObjectiveFoundation", () => {
  it("refuses a foundation that already has an objective this quarter", async () => {
    const fake = signedIn((c) => {
      if (c.table === "aspirations") return { data: { foundations: [{ id: "f1", name: "Body and mind" }], questions: [], vision: "" } };
      if (c.table === "objectives" && has(c, "maybeSingle")) return { data: { id: "o2", quarter: "2026-Q4" } };
      if (c.table === "objectives" && has(c, "neq")) return { data: [{ id: "o1" }] };
      return {};
    });
    const res = await (await load()).setObjectiveFoundation("o2", "f1");
    expect(res).toEqual({ ok: false, error: "That foundation already has an objective this quarter. One per foundation." });
    expect(fake.calls.some((c) => c.table === "objectives" && has(c, "update"))).toBe(false);
  });

  it("refuses a foundation that isn't in the aspiration", async () => {
    signedIn((c) => {
      if (c.table === "aspirations") return { data: { foundations: [{ id: "f1", name: "Body and mind" }] } };
      if (c.table === "objectives" && has(c, "maybeSingle")) return { data: { id: "o2", quarter: "2026-Q4" } };
      return {};
    });
    const res = await (await load()).setObjectiveFoundation("o2", "f9");
    expect(res.ok).toBe(false);
  });

  it("tags the objective, and clears a tag with null", async () => {
    const fake = signedIn((c) => {
      if (c.table === "aspirations") return { data: { foundations: [{ id: "f1", name: "Body and mind" }] } };
      if (c.table === "objectives" && has(c, "maybeSingle")) return { data: { id: "o2", quarter: "2026-Q4" } };
      if (c.table === "objectives" && has(c, "neq")) return { data: [] };
      return {};
    });
    const actions = await load();
    expect(await actions.setObjectiveFoundation("o2", "f1")).toEqual({ ok: true, data: undefined });
    expect(await actions.setObjectiveFoundation("o2", null)).toEqual({ ok: true, data: undefined });
    const updates = fake.calls.filter((c) => c.table === "objectives" && has(c, "update")).map((c) => c.ops[0].args[0]);
    expect(updates).toEqual([{ foundation: "f1" }, { foundation: null }]);
  });

  it("turns the database's unique-index error into the same message", async () => {
    signedIn((c) => {
      if (c.table === "aspirations") return { data: { foundations: [{ id: "f1", name: "Body and mind" }] } };
      if (c.table === "objectives" && has(c, "maybeSingle")) return { data: { id: "o2", quarter: "2026-Q4" } };
      if (c.table === "objectives" && has(c, "neq")) return { data: [] };
      if (c.table === "objectives" && has(c, "update")) return { error: { code: "23505", message: "duplicate key" } };
      return {};
    });
    const res = await (await load()).setObjectiveFoundation("o2", "f1");
    expect(res).toEqual({ ok: false, error: "That foundation already has an objective this quarter. One per foundation." });
  });
});
