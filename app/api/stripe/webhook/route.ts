import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { notifyFounders } from "@/lib/notify-founders";
import { formatAud } from "@/lib/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the only thing in this codebase allowed to say "paid".
 *
 * Fulfilment is driven from here and never from the success page, because a
 * club can pay and then lose their connection before the page loads; any
 * logic that only runs on the landing page silently drops those payments.
 *
 * THE RULE THAT MATTERS FOR DIRECT DEBIT:
 * `checkout.session.completed` arrives when the checkout is finished, NOT
 * when the money has moved. With BECS the mandate is signed immediately and
 * the funds settle about three business days later, so the session arrives
 * `payment_status: "unpaid"`. Fulfilling on that event alone would mark a
 * club paid for a debit that may still bounce, and would never fulfil the
 * ones that actually succeed. So:
 *
 *   - fulfil only when payment_status is NOT "unpaid"
 *   - also handle checkout.session.async_payment_succeeded, which is where
 *     a successful BECS payment really lands
 *   - handle checkout.session.async_payment_failed, which is the bounce
 *
 * Signature verification is mandatory: this endpoint is public, and without
 * it anyone who knows the URL could mark any club's proposal paid.
 */
const RELEVANT = new Set<string>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.deleted",
]);

function methodKind(session: Stripe.Checkout.Session): string | null {
  const types = session.payment_method_types;
  if (Array.isArray(types) && types.length > 0) return types.join(",");
  return null;
}

export async function POST(request: NextRequest) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  /* The RAW body. Parsing it first would change the bytes and every
     signature check would fail. */
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "bad signature";
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 });
  }

  if (!RELEVANT.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  async function markPaid(session: Stripe.Checkout.Session) {
    const proposalId = session.metadata?.proposal_id ?? (session.client_reference_id || null);
    if (!proposalId) return;
    const amount = session.amount_total ?? null;
    const { data: saved } = await admin
      .from("proposals")
      .update({
        payment_status: "paid",
        paid_at: nowIso,
        amount_paid_cents: amount,
        payment_method_kind: methodKind(session),
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        payment_failed_at: null,
        payment_failure_reason: null,
        updated_at: nowIso,
      })
      .eq("id", proposalId)
      /* Idempotent: Stripe retries, and completed + async_succeeded can
         both land for one payment. Whichever arrives first wins; the second
         updates nothing rather than re-stamping paid_at. */
      .neq("payment_status", "paid")
      .select("club_name, title")
      .maybeSingle();
    if (!saved) return;
    const club = (saved as { club_name?: string }).club_name ?? "A club";
    await notifyFounders({
      subject: `💳 ${club} has paid`,
      text: [
        `${club} paid ${amount == null ? "(amount unknown)" : formatAud(amount)}.`,
        `Proposal: ${(saved as { title?: string }).title ?? ""}`,
        `Method: ${methodKind(session) ?? "unknown"}`,
      ].join("\n"),
    }).catch(() => {});
  }

  async function markFailed(session: Stripe.Checkout.Session, reason: string) {
    const proposalId = session.metadata?.proposal_id ?? (session.client_reference_id || null);
    if (!proposalId) return;
    await admin
      .from("proposals")
      .update({
        payment_status: "failed",
        payment_failed_at: nowIso,
        payment_failure_reason: reason.slice(0, 500),
        updated_at: nowIso,
      })
      .eq("id", proposalId)
      .neq("payment_status", "paid");
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "unpaid") {
        /* A BECS mandate signed, money in flight. Recorded so the admin
           screens can say "processing" rather than showing nothing for
           three days and looking broken. NOT paid. */
        const proposalId = session.metadata?.proposal_id ?? (session.client_reference_id || null);
        if (proposalId) {
          await admin
            .from("proposals")
            .update({
              payment_status: "processing",
              payment_method_kind: methodKind(session),
              stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
              stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
              updated_at: nowIso,
            })
            .eq("id", proposalId)
            .eq("payment_status", "unpaid");
        }
        break;
      }
      await markPaid(session);
      break;
    }
    case "checkout.session.async_payment_failed": {
      await markFailed(event.data.object as Stripe.Checkout.Session, "The direct debit did not go through.");
      break;
    }
    case "invoice.payment_failed": {
      /* A LATER month failing, after the first payment succeeded. The
         proposal stays paid — that first payment really happened — so this
         only tells a human, rather than rewriting history. */
      const invoice = event.data.object as Stripe.Invoice;
      await notifyFounders({
        subject: `⚠️ A subscription payment failed`,
        text: [
          `Customer: ${typeof invoice.customer === "string" ? invoice.customer : "unknown"}`,
          `Amount: ${invoice.amount_due == null ? "unknown" : formatAud(invoice.amount_due)}`,
          `Stripe invoice: ${invoice.id ?? "unknown"}`,
        ].join("\n"),
      }).catch(() => {});
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await notifyFounders({
        subject: `🚪 A club's subscription ended`,
        text: `Subscription ${sub.id} is no longer active.`,
      }).catch(() => {});
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
