import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseProposalRow, proposalExpired } from "@/lib/proposals";
import { getStripe, hasRecurring, lineItemsFor, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/** 8 random letters, per Stripe's integration_identifier convention. */
function integrationTag(): string {
  const a = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return `sidelinepro-proposal-${s}`;
}

/**
 * Public: start paying for an accepted proposal.
 *
 * Separate from accepting it, on purpose. Accepting records who agreed and
 * to what, and that record has to stand whether or not the money then
 * arrives — BECS can sign a mandate today and fail three business days
 * later. So this route never writes "paid"; only the webhook does, and only
 * when Stripe says the funds are real.
 *
 * Prices are built inline from the proposal's own pricing lines (see
 * lib/stripe.ts): the quote is bespoke per club, and a Stripe product
 * catalogue would be the same numbers in a second place, drifting from the
 * first time anyone edited a quote.
 */
export async function POST(request: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  if (!token || token.length < 12) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Online payment is not switched on yet. We will send you an invoice instead." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("proposals").select("*").eq("token", token).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = normaliseProposalRow(data as Record<string, unknown>);
  if (row.status === "draft") return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* Pay only what has been agreed. Taking money against a proposal nobody
     accepted would leave us holding a club's funds with no record of who
     authorised it. */
  if (row.status !== "accepted") {
    return NextResponse.json({ error: "Please accept the proposal first." }, { status: 409 });
  }
  if (row.payment_status === "paid") {
    return NextResponse.json({ alreadyPaid: true }, { status: 200 });
  }
  if (proposalExpired(row.valid_until)) {
    return NextResponse.json({ error: "This proposal has expired. Get in touch and we will refresh it." }, { status: 409 });
  }

  const { recurring, oneOff } = lineItemsFor(row);
  if (recurring.length === 0 && oneOff.length === 0) {
    return NextResponse.json({ error: "This proposal has nothing to pay." }, { status: 409 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://sidelinepro.com.au";
  const subscription = hasRecurring(row.pricing);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: subscription ? "subscription" : "payment",
      /* A setup fee rides on the first invoice of the subscription rather
         than becoming a second checkout — one mandate, one card entry, one
         thing for the committee to approve. */
      line_items: [...recurring, ...oneOff],
      customer_email: row.accepted_email ?? undefined,
      client_reference_id: row.id,
      /* Dashboard label for comparing checkout flows. */
      integration_identifier: integrationTag(),
      /* The webhook reads these rather than trusting anything the browser
         sends back from the success page. */
      metadata: { proposal_id: row.id, proposal_token: row.token, club_name: row.club_name },
      ...(subscription
        ? { subscription_data: { metadata: { proposal_id: row.id, club_name: row.club_name } } }
        : { payment_intent_data: { metadata: { proposal_id: row.id, club_name: row.club_name } } }),
      success_url: `${origin}/proposal/${row.token}?paid=1`,
      cancel_url: `${origin}/proposal/${row.token}`,
      /* NO payment_method_types. Stripe's guidance is explicit: omitting it
         enables dynamic payment methods, configured in the Dashboard. BECS
         direct debit must be switched on there — if it is not, clubs are
         quietly offered cards only and pay roughly $100 a year more in
         fees, with no error anywhere. */
    });

    await admin
      .from("proposals")
      .update({
        stripe_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        payment_status: row.payment_status === "failed" ? "unpaid" : row.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start the payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
