// Server-side helpers for /api/crm/* (imports next/headers via the Supabase
// server client, so never import this from a client component).
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

/**
 * Every CRM route starts here: a signed-in user on the ADMIN_EMAILS
 * allowlist, or a 401. The crm_* tables have RLS on with no policies, so
 * the service-role client below is the only way in.
 */
export async function requireAdmin(): Promise<{ email: string } | null> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return { email: user.email! };
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export function db(): SupabaseClient {
  return createAdminClient();
}

/** PostgREST caps a select at 1,000 rows; page through to get them all. */
export async function fetchAll<T>(
  admin: SupabaseClient,
  table: string,
  select = "*",
  eq?: [column: string, value: string],
  /** A unique ordering, so pages never overlap or skip rows. */
  orderBy: string[] = ["id"],
): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = admin.from(table).select(select);
    if (eq) q = q.eq(eq[0], eq[1]);
    for (const col of orderBy) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) break;
  }
  return out;
}

export type ChangeEntry = {
  entity: string;
  entity_id?: string | null;
  action: string;
  changes?: Record<string, unknown>;
  source_url?: string | null;
  source_note?: string | null;
  import_id?: string | null;
  actor_email: string;
};

/** Append to the provenance log. Never throws — a log failure must not lose the edit. */
export async function logChange(admin: SupabaseClient, entries: ChangeEntry | ChangeEntry[]) {
  const rows = (Array.isArray(entries) ? entries : [entries]).map((e) => ({
    entity: e.entity,
    entity_id: e.entity_id ?? null,
    action: e.action,
    changes: e.changes ?? {},
    source_url: e.source_url ?? null,
    source_note: e.source_note ?? null,
    import_id: e.import_id ?? null,
    actor_email: e.actor_email,
  }));
  if (!rows.length) return;
  const { error } = await admin.from("crm_change_log").insert(rows);
  if (error) console.error("[crm] change log failed", error.message);
}

/** Old → new for the fields that actually changed. */
export function diff(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(after)) {
    if (k === "updated_at") continue;
    const prev = before ? before[k] : undefined;
    if (JSON.stringify(prev ?? null) !== JSON.stringify(v ?? null)) out[k] = { from: prev ?? null, to: v ?? null };
  }
  return out;
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}
