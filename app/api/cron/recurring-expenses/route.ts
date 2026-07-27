import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Don't cache — this mutates data and must run fresh each invocation.
export const dynamic = "force-dynamic";

/**
 * Daily cron (see vercel.json) that materialises recurring expenses.
 *
 * For every recurring template whose next occurrence has come due, the
 * generate_due_recurring_expenses() DB function creates a fresh expense row
 * carrying paid_by across — so a card in someone's name lands as a new
 * "awaiting reimbursement" entry each period. Idempotent, so re-runs are safe.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET
 * is set on the project. We require it, so the endpoint can't be triggered by
 * anyone else.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("generate_due_recurring_expenses");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: data ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
