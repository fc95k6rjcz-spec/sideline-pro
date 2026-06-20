import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

type CreateBody = {
  date?: unknown;
  description?: unknown;
  amount_cents?: unknown;
  gst_cents?: unknown;
  receipt_url?: unknown;
  receipt_pathname?: unknown;
};

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBody | null = null;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  const { date, description, amount_cents, gst_cents } = body;
  if (typeof date !== "string" || date.length < 8) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }
  if (typeof amount_cents !== "number" || !Number.isFinite(amount_cents)) {
    return NextResponse.json({ error: "amount_cents required (number)" }, { status: 400 });
  }
  if (typeof gst_cents !== "number" || !Number.isFinite(gst_cents)) {
    return NextResponse.json({ error: "gst_cents required (number)" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    date,
    description: description.trim(),
    amount_cents: Math.round(amount_cents),
    gst_cents: Math.round(gst_cents),
    created_by_email: user.email,
  };
  if (typeof body.receipt_url === "string" && body.receipt_url.length > 0) {
    insert.receipt_url = body.receipt_url;
    insert.receipt_uploaded_at = new Date().toISOString();
  }
  if (typeof body.receipt_pathname === "string" && body.receipt_pathname.length > 0) {
    insert.receipt_pathname = body.receipt_pathname;
  }

  // Optional categorisation / accounting fields
  const optionalStrings = [
    "status", // 'planned' | 'paid'
    "paid_by", // 'business' | 'justin' | 'rowan'
    "category",
    "vendor",
    "recurring_frequency", // 'monthly' | 'quarterly' | 'yearly'
    "reimbursed_date", // YYYY-MM-DD
    "reimbursed_txn_id",
  ] as const;
  const extras = body as Record<string, unknown>;
  for (const field of optionalStrings) {
    const v = extras[field];
    if (typeof v === "string" && v.trim().length > 0) {
      insert[field] = v.trim();
    }
  }
  if (typeof extras.reimbursed === "boolean") {
    insert.reimbursed = extras.reimbursed;
  }
  if (typeof extras.is_recurring === "boolean") {
    insert.is_recurring = extras.is_recurring;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("expenses")
      .insert(insert)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ expense: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
