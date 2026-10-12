import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, has, type Resolver } from "./fake-supabase";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  client: null as unknown,
  admin: null as unknown,
  streamText: ["Your ", "numbers ", "say otherwise."],
  streamArgs: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (args: unknown) => {
        state.streamArgs.push(args);
        return (async function* () {
          for (const text of state.streamText) yield { type: "content_block_delta", delta: { type: "text_delta", text } };
        })();
      },
    };
  },
}));

const USER = { id: "11111111-1111-1111-1111-111111111111", email: "a@x.com" };
const reviewRow = (completed: boolean) => ({
  week: "2026-W41", carried: [], next: [], confidence: {}, kr_values: {}, sparring: null,
  reflection: { moved: "Two meetings", avoided: "Pricing call", lesson: "", energy: 3 },
  completed_at: completed ? "2026-10-09T15:00:00Z" : null, updated_at: "2026-10-09T15:00:00Z",
});

function signedIn(resolve: Resolver, user: typeof USER | null = USER) {
  const fake = fakeSupabase(resolve, { getUser: async () => ({ data: { user } }) });
  state.client = fake.client;
  return fake;
}

const sparRequest = (body: unknown) =>
  new Request("http://localhost/api/spar", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
  vi.stubEnv("SPAR_DAILY_LIMIT", "8");
  state.streamArgs = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/spar", () => {
  const load = async () => (await import("@/app/api/spar/route")).POST;

  it("is off without an API key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    signedIn(() => ({}));
    expect((await (await load())(sparRequest({ week: "2026-W41" }))).status).toBe(503);
  });

  it("refuses signed-out requests", async () => {
    signedIn(() => ({}), null);
    expect((await (await load())(sparRequest({ week: "2026-W41" }))).status).toBe(401);
  });

  it("rejects an invalid week", async () => {
    signedIn(() => ({}));
    expect((await (await load())(sparRequest({ week: "2026-W99" }))).status).toBe(400);
  });

  it("enforces the daily limit before calling Claude", async () => {
    signedIn((c) => (c.table === "spar_events" ? { count: 8 } : {}));
    const res = await (await load())(sparRequest({ week: "2026-W41" }));
    expect(res.status).toBe(429);
    expect(state.streamArgs).toHaveLength(0);
  });

  it("requires a completed review", async () => {
    signedIn((c) => (c.table === "reviews" && has(c, "maybeSingle") ? { data: reviewRow(false) } : { count: 0 }));
    expect((await (await load())(sparRequest({ week: "2026-W41" }))).status).toBe(409);
  });

  it("streams Claude's reply, logs the use and saves the reply on the review", async () => {
    const fake = signedIn((c) => {
      if (c.table === "spar_events") return { count: 2 };
      if (c.table === "reviews" && has(c, "maybeSingle")) return { data: reviewRow(true) };
      if (c.table === "profiles") return { data: { timezone: "Europe/Berlin" } };
      return { data: [] };
    });
    const res = await (await load())(sparRequest({ week: "2026-W41" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Your numbers say otherwise.");

    const args = state.streamArgs[0] as { model: string; messages: { content: string }[] };
    expect(args.model).toBe("claude-sonnet-5-5");
    expect(args.messages[0].content).toContain("Pricing call");

    const logged = fake.calls.find((c) => c.table === "spar_events" && has(c, "insert"));
    expect(logged?.ops[0].args[0]).toEqual({ user_id: USER.id, week: "2026-W41" });
    await vi.waitFor(() => {
      const saved = fake.calls.find((c) => c.table === "reviews" && has(c, "update"));
      expect(saved?.ops[0].args[0]).toEqual({ sparring: "Your numbers say otherwise." });
    });
  });
});

describe("POST /api/spar with an aspiration", () => {
  it("sends the vision, foundations and open questions to Claude", async () => {
    signedIn((c) => {
      if (c.table === "spar_events") return { count: 0 };
      if (c.table === "reviews" && has(c, "maybeSingle")) return { data: reviewRow(true) };
      if (c.table === "profiles") return { data: { timezone: "Europe/Berlin" } };
      if (c.table === "aspirations") {
        return {
          data: {
            horizon_year: 2036, vision: "Chile, family, an exit behind me.", updated_at: "2026-10-12T20:00:00Z",
            foundations: [{ id: "f1", name: "Body and mind" }, { id: "bad id!", name: "Dropped" }],
            questions: ["Search or build?"],
          },
        };
      }
      if (c.table === "objectives") {
        return {
          data: [{
            id: "o1", quarter: "2026-Q4", position: 0, title: "Sub-3:30 marathon", why: "", foundation: "f1",
            key_results: [], created_at: "", updated_at: "",
          }],
        };
      }
      return { data: [] };
    });
    const res = await (await import("@/app/api/spar/route")).POST(sparRequest({ week: "2026-W41" }));
    expect(res.status).toBe(200);
    await res.text();
    const content = (state.streamArgs[0] as { messages: { content: string }[] }).messages[0].content;
    expect(content).toContain("Vision: Chile, family, an exit behind me.");
    expect(content).toContain("1. Body and mind: Sub-3:30 marathon");
    expect(content).not.toContain("Dropped");
    expect(content).toContain("- Search or build?");
    expect(content).toContain("Long game:");
  });
});

describe("sign-in return routes", () => {
  it("exchanges the magic-link code and goes to the requested page", async () => {
    const exchange = vi.fn(async () => ({ error: null }));
    signedIn(() => ({}));
    (state.client as { auth: Record<string, unknown> }).auth.exchangeCodeForSession = exchange;
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(new Request("http://localhost/auth/callback?code=abc&next=/app/objectives"));
    expect(exchange).toHaveBeenCalledWith("abc");
    expect(res.headers.get("location")).toBe("http://localhost/app/objectives");
  });

  it("never redirects off-site and sends a failed link back to sign-in", async () => {
    signedIn(() => ({}));
    (state.client as { auth: Record<string, unknown> }).auth.exchangeCodeForSession = async () => ({ error: { message: "expired" } });
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(new Request("http://localhost/auth/callback?code=old&next=//evil.com"));
    expect(res.headers.get("location")).toBe("http://localhost/login?error=link&next=%2Fapp");
  });

  it("verifies a token hash for cross-device links", async () => {
    const verify = vi.fn(async () => ({ error: null }));
    signedIn(() => ({}));
    (state.client as { auth: Record<string, unknown> }).auth.verifyOtp = verify;
    const { GET } = await import("@/app/auth/confirm/route");
    const res = await GET(new Request("http://localhost/auth/confirm?token_hash=h&type=email"));
    expect(verify).toHaveBeenCalledWith({ type: "email", token_hash: "h" });
    expect(res.headers.get("location")).toBe("http://localhost/app");
  });
});

describe("GET /api/cron/reminders", () => {
  const cron = (auth?: string) =>
    new Request("http://localhost/api/cron/reminders", { headers: auth ? { authorization: auth } : {} });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T13:00:00Z")); // a Friday (review_weekday 4; 0 = Monday)
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("REMINDER_FROM", "Threefold <review@example.com>");
  });
  afterEach(() => vi.useRealTimers());

  it("requires the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/reminders/route");
    expect((await GET(cron())).status).toBe(401);
    expect((await GET(cron("Bearer wrong"))).status).toBe(401);
  });

  it("emails only people whose review day is today and whose week is open", async () => {
    const profiles = [
      { id: "due", email: "due@x.com", display_name: "Ann Lee", timezone: "Europe/Berlin", review_weekday: 4, last_reminder_week: null },
      { id: "done", email: "done@x.com", display_name: "", timezone: "Europe/Berlin", review_weekday: 4, last_reminder_week: null },
      { id: "sunday", email: "sun@x.com", display_name: "", timezone: "Europe/Berlin", review_weekday: 6, last_reminder_week: null },
      { id: "already", email: "al@x.com", display_name: "", timezone: "Europe/Berlin", review_weekday: 4, last_reminder_week: "2026-W42" },
    ];
    const fake = fakeSupabase((c) => {
      if (c.table === "profiles" && has(c, "range")) return { data: profiles };
      if (c.table === "reviews") {
        const user = c.ops.find((o) => o.op === "eq" && o.args[0] === "user_id")?.args[1];
        return { data: user === "done" ? { completed_at: "x" } : null };
      }
      return {};
    });
    state.admin = fake.client;
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/cron/reminders/route");
    const res = await GET(cron("Bearer s3cret"));
    expect(await res.json()).toEqual({ checked: 4, sent: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    expect(body.to).toBe("due@x.com");
    expect(body.subject).toBe("Week 42: time for your review");
    expect(body.html).toContain("Ann, week 42");

    const marked = fake.calls.find((c) => c.table === "profiles" && has(c, "update"));
    expect(marked?.ops[0].args[0]).toEqual({ last_reminder_week: "2026-W42" });
  });
});
