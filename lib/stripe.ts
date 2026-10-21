import Stripe from "stripe";
import type { ProposalPrice, ProposalRow } from "@/lib/proposals";

/**
 * Stripe, for taking payment when a club accepts a proposal.
 *
 * Deliberately NOT a product catalogue. Every price is built inline from the
 * proposal's own `pricing` lines, because the quote is bespoke per club: a
 * catalogue in Stripe would be the same numbers in a second place, and the
 * two would drift the first time a quote was edited. The proposal is the one
 * source of truth for what a club agreed to pay.
 */
let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "[stripe] STRIPE_SECRET_KEY is not set. Proposals can still be accepted; they just cannot be paid.",
    );
  }
  if (!cached) cached = new Stripe(key, { apiVersion: "2026-09-30.endive" });
  return cached;
}

/** True while the key is a test key, so the UI can say so out loud. */
export function stripeIsTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

export type RecurringInterval = { interval: "month" | "year"; interval_count: number };

/**
 * A proposal period as a Stripe recurrence, or null for a one-off.
 *
 * Stripe only knows day/week/month/year, so "season" has to become a real
 * number of months. Netball runs two seasons a year (winter, spring), so a
 * season bills every six months. If that is ever wrong it is a commercial
 * decision, not a technical one — change it here and nowhere else.
 */
export function recurrenceFor(period: ProposalPrice["period"]): RecurringInterval | null {
  switch (period) {
    case "month":
      return { interval: "month", interval_count: 1 };
    case "year":
      return { interval: "year", interval_count: 1 };
    case "season":
      return { interval: "month", interval_count: 6 };
    default:
      return null;
  }
}

export function hasRecurring(pricing: ProposalPrice[]): boolean {
  return pricing.some((l) => recurrenceFor(l.period) !== null);
}

/**
 * How a club may pay — and why this is NOT set in code.
 *
 * Stripe removed `payment_method_types` from Checkout: the methods a session
 * offers now come from the Dashboard (Settings → Payment methods), and
 * Checkout shows whichever are eligible for the currency and mode. So BECS
 * direct debit has to be switched on there. If it is not, a club sees cards
 * only and nobody gets an error — the quieter failure, which is why it is
 * written down here.
 *
 * BECS is what we want for anything recurring: a club pays from a club bank
 * account, and on $657.80 a month BECS costs about $3.50 against a card's
 * $11.81 — roughly $100 a year that would otherwise leave the club's budget
 * for nothing. Cards stay on because some committees cannot authorise a debit
 * mandate on the spot.
 *
 * The trade is settlement: BECS takes about three business days and a failure
 * surfaces days later, where a card declines immediately. The webhook is what
 * makes that safe — nothing counts as paid until Stripe says it is.
 */
export const PAYMENT_METHODS_TO_ENABLE = ["card", "au_becs_debit"] as const;

/** GST-inclusive cents → the line items Checkout bills. */
export function lineItemsFor(
  proposal: Pick<ProposalRow, "club_name" | "pricing">,
): {
  recurring: Stripe.Checkout.SessionCreateParams.LineItem[];
  oneOff: Stripe.Checkout.SessionCreateParams.LineItem[];
} {
  const recurring: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const oneOff: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const line of proposal.pricing) {
    if (line.amount_cents <= 0) continue;
    const recurrence = recurrenceFor(line.period);
    const item: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: line.amount_cents,
        product_data: {
          name: line.label,
          ...(line.note ? { description: line.note } : {}),
        },
        ...(recurrence ? { recurring: recurrence } : {}),
      },
    };
    if (recurrence) recurring.push(item);
    else oneOff.push(item);
  }
  return { recurring, oneOff };
}
