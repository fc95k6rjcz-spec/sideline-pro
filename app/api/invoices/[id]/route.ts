import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const PATCHABLE = [
  "invoice_number",
  "client_name",
  "client_sub_org",
  "issue_date",
  "due_date",
  "next_invoice_date",
  "billing_cycle_days",
  "subtotal_cents",
  "gst_cents",
  "total_cents",
  "currency",
  "description",
  "pdf_url",
  "pdf_pathname",
  "paid",
  "paid_date",
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of PATCHABLE) {
    if (f in body) updates[f] = body[f];
  }
  // Auto-stamp paid_date when toggling paid on, clear when toggling off
  if (updates.paid === true && !("paid_date" in updates)) {
    updates.paid_date = new Date().toISOString().slice(0, 10);
  }
  if (updates.paid === false) {
    updates.paid_date = null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invoice: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("invoices").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
