import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [{ data, error }, { data: proposalRows }] = await Promise.all([
      admin.from("prospects").select("*").order("club_name", { ascending: true }),
      /**
       * The quote each club is holding, folded into the same response.
       *
       * Until now a proposal was only visible once you opened a prospect's
       * drawer, so the pipeline screen could not answer the first question
       * anyone asks it — who have we actually quoted? Eighteen clubs all
       * reading "New" with no sign that one of them has a live quote is a
       * list that looks like nothing is happening.
       *
       * Newest first, and the map keeps the first it sees, so a club with
       * several proposals shows its most recent.
       */
      admin
        .from("proposals")
        .select("prospect_id, token, status, sent_at, view_count, valid_until, accepted_at, payment_status, pricing")
        .not("prospect_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const proposalByProspect: Record<string, unknown> = {};
    for (const r of (proposalRows ?? []) as Array<Record<string, unknown>>) {
      const key = String(r.prospect_id ?? "");
      if (!key || key in proposalByProspect) continue;
      const pricing = Array.isArray(r.pricing) ? (r.pricing as Array<{ amount_cents?: number }>) : [];
      proposalByProspect[key] = {
        token: r.token,
        status: r.status,
        sent_at: r.sent_at,
        view_count: Number(r.view_count ?? 0) || 0,
        valid_until: r.valid_until,
        accepted_at: r.accepted_at,
        payment_status: r.payment_status ?? "unpaid",
        total_cents: pricing.reduce((n, l) => n + (Number(l.amount_cents) || 0), 0),
      };
    }

    return NextResponse.json({ prospects: data ?? [], proposals: proposalByProspect });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
