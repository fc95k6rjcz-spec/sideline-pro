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
    const [{ data, error }, { data: proposalRows, error: proposalError }] = await Promise.all([
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
      /* `select("*")` rather than a column list ON PURPOSE. Naming
         payment_status here made this whole query fail with a 400 on any
         database where sql/proposal_payments.sql had not been applied yet —
         and because the error was swallowed below, every club silently
         showed "—" in the Quote column. The pipeline looked empty when it
         was not. A column list couples a feature that has nothing to do
         with Stripe to a Stripe migration; `*` does not. */
      admin
        .from("proposals")
        .select("*")
        .not("prospect_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* Loud, not silent. A broken proposals read must not masquerade as "no
       club has been quoted" — that is a lie the pipeline cannot afford, and
       it is exactly what happened the first time this shipped. The prospects
       list still renders; the Quote column just has nothing to show, and the
       reason is in the logs and in the response. */
    if (proposalError) {
      console.error("[prospects/list] proposals read failed", proposalError.message);
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

    return NextResponse.json({
      prospects: data ?? [],
      proposals: proposalByProspect,
      ...(proposalError ? { proposalsError: proposalError.message } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
