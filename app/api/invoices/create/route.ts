import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

const REQUIRED = [
  "invoice_number",
  "prefix",
  "client_name",
  "issue_date",
  "due_date",
  "subtotal_cents",
  "gst_cents",
  "total_cents",
] as const;

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  for (const f of REQUIRED) {
    if (!(f in body)) {
      return NextResponse.json({ error: `${f} required` }, { status: 400 });
    }
  }

  const row: Record<string, unknown> = {
    invoice_number: String(body.invoice_number),
    prefix: String(body.prefix),
    client_name: String(body.client_name),
    client_sub_org: body.client_sub_org ? String(body.client_sub_org) : null,
    issue_date: String(body.issue_date),
    due_date: String(body.due_date),
    subtotal_cents: Math.round(Number(body.subtotal_cents)),
    gst_cents: Math.round(Number(body.gst_cents)),
    total_cents: Math.round(Number(body.total_cents)),
    currency: body.currency ? String(body.currency) : "AUD",
    description: body.description ? String(body.description) : null,
    billing_cycle_days:
      body.billing_cycle_days === null || body.billing_cycle_days === undefined
        ? null
        : Number(body.billing_cycle_days),
    next_invoice_date: body.next_invoice_date ? String(body.next_invoice_date) : null,
    pdf_url: body.pdf_url ? String(body.pdf_url) : null,
    pdf_pathname: body.pdf_pathname ? String(body.pdf_pathname) : null,
    // Persist the recipient email at generation time so we can re-send from the
    // ledger later (before the first send has stamped it). Falsy → null so we
    // never overwrite a previously-saved value with an empty string on upsert.
    client_email: body.client_email ? String(body.client_email).trim() : null,
    created_by_email: user.email,
    updated_at: new Date().toISOString(),
  };

  try {
    const admin = createAdminClient();
    // Upsert on invoice_number — re-downloading the same invoice updates the record.
    const { data, error } = await admin
      .from("invoices")
      .upsert(row, { onConflict: "invoice_number" })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ invoice: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
