import { describe, expect, it } from "vitest";
import { lineItemsFor, recurrenceFor, hasRecurring, PAYMENT_METHODS_TO_ENABLE } from "@/lib/stripe";
import type { ProposalPrice } from "@/lib/proposals";

/**
 * The Queenscliff shape: $6,000 + GST setup once, $598 + GST a month.
 * Both quoted GST-inclusive, which is how every Sideline Pro quote is
 * written, so Stripe is never asked to calculate tax.
 */
const SETUP: ProposalPrice = { label: "Setup and migration", amount_cents: 660000, period: "once" };
const MONTHLY: ProposalPrice = { label: "Platform and support", amount_cents: 65780, period: "month" };
const ANNUAL: ProposalPrice = { label: "Platform and support, paid yearly", amount_cents: 670956, period: "year" };

describe("a proposal period as a Stripe recurrence", () => {
  it("maps the periods Stripe understands", () => {
    expect(recurrenceFor("month")).toEqual({ interval: "month", interval_count: 1 });
    expect(recurrenceFor("year")).toEqual({ interval: "year", interval_count: 1 });
  });

  /** Stripe only knows day/week/month/year, so a season has to become a
   *  real number of months. Two seasons a year — winter and spring. */
  it("turns a season into six months, since Stripe has no such interval", () => {
    expect(recurrenceFor("season")).toEqual({ interval: "month", interval_count: 6 });
  });

  it("treats a one-off as not recurring at all", () => {
    expect(recurrenceFor("once")).toBeNull();
    expect(recurrenceFor(undefined)).toBeNull();
  });
});

describe("building Checkout line items from the quote", () => {
  it("splits the setup fee from the subscription", () => {
    const { recurring, oneOff } = lineItemsFor({ club_name: "Queenscliff Netball", pricing: [SETUP, MONTHLY] });
    expect(oneOff).toHaveLength(1);
    expect(recurring).toHaveLength(1);
  });

  it("prices in AUD cents straight off the proposal, with no catalogue", () => {
    const { oneOff } = lineItemsFor({ club_name: "Queenscliff Netball", pricing: [SETUP] });
    const price = oneOff[0]!.price_data!;
    expect(price.currency).toBe("aud");
    expect(price.unit_amount).toBe(660000);
    expect(price.product_data!.name).toBe("Setup and migration");
    expect(price.recurring).toBeUndefined();
  });

  it("carries the recurrence onto the subscription line", () => {
    const { recurring } = lineItemsFor({ club_name: "Queenscliff Netball", pricing: [MONTHLY] });
    expect(recurring[0]!.price_data!.recurring).toEqual({ interval: "month", interval_count: 1 });
  });

  /** A zero or negative line is a typo in the quote, not a free gift —
   *  billing $0 would create a live subscription worth nothing. */
  it("skips lines with nothing to charge", () => {
    const { recurring, oneOff } = lineItemsFor({
      club_name: "Q",
      pricing: [{ label: "Included", amount_cents: 0, period: "once" }, MONTHLY],
    });
    expect(oneOff).toHaveLength(0);
    expect(recurring).toHaveLength(1);
  });

  it("knows a yearly-up-front quote is still a subscription", () => {
    expect(hasRecurring([SETUP, ANNUAL])).toBe(true);
    expect(hasRecurring([SETUP])).toBe(false);
  });
});

describe("payment methods are Dashboard configuration, not code", () => {
  /**
   * Stripe removed payment_method_types from Checkout: listing methods in
   * code now disables dynamic payment methods. BECS has to be enabled in
   * the Dashboard, and if it is not, clubs are quietly offered cards only
   * — about $100 a year more in fees, with no error anywhere. This list
   * exists to document what must be switched on, and nothing passes it to
   * the API.
   */
  it("documents what to enable without sending it to Stripe", () => {
    expect([...PAYMENT_METHODS_TO_ENABLE]).toEqual(["card", "au_becs_debit"]);
  });
});
