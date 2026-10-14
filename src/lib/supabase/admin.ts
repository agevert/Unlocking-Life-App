import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/** Bypasses row-level security. Use only for account deletion, scheduled jobs and authenticated coaching quota accounting. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
