import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const PATCHABLE_FIELDS = [
  "date",
  "description",
  "amount_cents",
  "gst_cents",
  "receipt_url",
  "receipt_pathname",
  "receipt_uploaded_at",
  // accounting / categorisation
  "status",
  "paid_by",
  "reimbursed",
  "reimbursed_date",
  "reimbursed_txn_id",
  "category",
  "vendor",
  "is_recurring",
  "recurring_frequency",
] as const;

async function requireUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

export async function PATCH(request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const field of PATCHABLE_FIELDS) {
    if (field in body) {
      updates[field] = body[field];
    }
  }
  // If we're attaching a receipt URL, stamp the uploaded_at if not provided
  if (
    typeof updates.receipt_url === "string" &&
    !("receipt_uploaded_at" in updates)
  ) {
    updates.receipt_uploaded_at = new Date().toISOString();
  }
  // If we're toggling reimbursed=true and no reimbursed_date provided, stamp today
  if (updates.reimbursed === true && !("reimbursed_date" in updates)) {
    updates.reimbursed_date = new Date().toISOString().slice(0, 10);
  }
  // If we're un-reimbursing, clear the date + txn id
  if (updates.reimbursed === false) {
    updates.reimbursed_date = null;
    updates.reimbursed_txn_id = null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ expense: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("expenses").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
