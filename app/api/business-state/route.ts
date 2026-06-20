import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

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

  // Optional: snapshot_baseline_cents — the cumulative cash-out value at the
  // moment of this reset. Client computes and sends it so the server can
  // store it as the new "zero" for Recent cash out.
  const baselineRaw = body.snapshot_baseline_cents;
  const baseline =
    typeof baselineRaw === "number" && Number.isFinite(baselineRaw)
      ? Math.round(baselineRaw)
      : null;

  try {
    const admin = createAdminClient();
    const upsertRow: Record<string, unknown> = {
      id: 1,
      account_balance_cents: Math.round(balance),
      account_balance_updated_at: new Date().toISOString(),
      updated_by_email: user.email,
    };
    if (baseline !== null) {
      upsertRow.snapshot_baseline_cents = baseline;
    }
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
