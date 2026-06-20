import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side admin Supabase client using the service role key.
 * Bypasses Row Level Security. Use only inside API routes that have
 * already authenticated the caller via the cookie-based session.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
