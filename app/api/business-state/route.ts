import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { cumulativeCashOutCents, type CashOutExpense } from "@/lib/cash-out";

export const runtime = "nodejs";

async function requireUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("business_state")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) {
      // Auto-create the singleton row if missing
      if (error.code === "PGRST116") {
        const { data: created, error: createErr } = await admin
          .from("business_state")
          .insert({ id: 1, account_balance_cents: 0 })
          .select()
          .single();
        if (createErr) {
          return NextResponse.json({ error: createErr.message }, { status: 500 });
        }
        return NextResponse.json({ state: created });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ state: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const balance = body.account_balance_cents;
  if (typeof balance !== "number" || !Number.isFinite(balance)) {
    return NextResponse.json(
      { error: "account_balance_cents required (number)" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();

    // Reconcile: the caller confirms what the bank actually says right now, so
    // the new baseline is the cumulative cash-out as of this instant — that
    // resets "since last confirmation" to zero. Read it from the database
    // rather than trusting a client-sent figure: a stale or partially-loaded
    // client would persist a wrong baseline and skew the derived balance until
    // the next reconcile.
    const { data: expenseRows, error: expensesErr } = await admin
      .from("expenses")
      .select("amount_cents, status, paid_by, reimbursed");
    if (expensesErr) {
      return NextResponse.json({ error: expensesErr.message }, { status: 500 });
    }
    const baseline = cumulativeCashOutCents(
      (expenseRows ?? []) as CashOutExpense[],
    );

    const upsertRow: Record<string, unknown> = {
      id: 1,
      account_balance_cents: Math.round(balance),
      account_balance_updated_at: new Date().toISOString(),
      updated_by_email: user.email,
      snapshot_baseline_cents: baseline,
    };
    const { data, error } = await admin
      .from("business_state")
      .upsert(upsertRow)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ state: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
