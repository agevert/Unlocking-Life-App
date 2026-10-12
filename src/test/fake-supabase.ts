/**
 * A minimal stand-in for the Supabase query builder, for route tests.
 * Every chained call is recorded; awaiting the chain asks `resolve` for the result.
 */
export type Call = { table: string; ops: { op: string; args: unknown[] }[] };
export type Resolver = (call: Call) => { data?: unknown; error?: unknown; count?: number | null };

export function fakeSupabase(resolve: Resolver, auth: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    const chain = (op: string) => (...args: unknown[]) => {
      call.ops.push({ op, args });
      return builder;
    };
    for (const op of ["select", "insert", "update", "delete", "eq", "not", "gte", "lt", "order", "limit", "range"]) {
      builder[op] = chain(op);
    }
    builder.maybeSingle = chain("maybeSingle");
    builder.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null, count: null, ...resolve(call) }).then(ok, fail);
    return builder;
  };
  return { client: { from, auth }, calls };
}

export const has = (call: Call, op: string) => call.ops.some((o) => o.op === op);
