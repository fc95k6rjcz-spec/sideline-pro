import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Next invoice sequence for a prefix + year, derived from the ledger itself.
 *
 * Invoice numbers were previously sequenced from the browser's localStorage,
 * which resets per-device and let two invoices collide on the same number —
 * and because create upserts on invoice_number, the second silently overwrote
 * the first. Sourcing the next number from the DB removes that whole class of
 * data loss: a new invoice always lands above everything already saved.
 */
export async function GET(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const prefix = (searchParams.get("prefix") ?? "").trim();
  const year = Number(searchParams.get("year"));
  if (!prefix || !Number.isFinite(year)) {
    return NextResponse.json(
      { error: "prefix and year required" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${prefix}-${year}-%`);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    let max = 0;
    for (const r of data ?? []) {
      const m = /-(\d+)$/.exec(String(r.invoice_number));
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return NextResponse.json({ next: max + 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
