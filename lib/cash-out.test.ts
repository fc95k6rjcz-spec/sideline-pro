import { describe, expect, it } from "vitest";
import {
  cashOutSinceBaselineCents,
  cumulativeCashOutCents,
  derivedBalanceCents,
  type CashOutExpense,
} from "@/lib/cash-out";

const e = (o: Partial<CashOutExpense>): CashOutExpense => ({
  amount_cents: 0,
  status: "paid",
  paid_by: "business",
  reimbursed: null,
  ...o,
});

describe("cumulativeCashOutCents", () => {
  it("counts business-paid expenses", () => {
    expect(cumulativeCashOutCents([e({ amount_cents: 5_000 })])).toBe(5_000);
  });

  it("counts paid reimbursements of personally-paid expenses", () => {
    expect(
      cumulativeCashOutCents([
        e({ amount_cents: 5_000, paid_by: "justin", reimbursed: true }),
      ]),
    ).toBe(5_000);
  });

  it("ignores personally-paid expenses not yet reimbursed", () => {
    expect(
      cumulativeCashOutCents([
        e({ amount_cents: 5_000, paid_by: "justin", reimbursed: false }),
      ]),
    ).toBe(0);
  });

  it("ignores planned (not-yet-paid) business expenses", () => {
    expect(
      cumulativeCashOutCents([e({ amount_cents: 5_000, status: "planned" })]),
    ).toBe(0);
  });

  it("treats a legacy null status as paid", () => {
    expect(
      cumulativeCashOutCents([e({ amount_cents: 5_000, status: null })]),
    ).toBe(5_000);
  });

  it("does not double-count a business expense flagged reimbursed", () => {
    expect(
      cumulativeCashOutCents([
        e({ amount_cents: 5_000, paid_by: "business", reimbursed: true }),
      ]),
    ).toBe(5_000);
  });

  it("counts a reimbursed expense with null paid_by once", () => {
    expect(
      cumulativeCashOutCents([
        e({ amount_cents: 5_000, paid_by: null, reimbursed: true }),
      ]),
    ).toBe(5_000);
  });
});

describe("cashOutSinceBaselineCents", () => {
  it("subtracts the baseline recorded at the last reconcile", () => {
    const expenses = [e({ amount_cents: 100_000 }), e({ amount_cents: 20_000 })];
    expect(cashOutSinceBaselineCents(expenses, 100_000)).toBe(20_000);
  });

  it("clamps to zero when the baseline is stale/over-large, never negative", () => {
    expect(cashOutSinceBaselineCents([e({ amount_cents: 1_000 })], 999_999)).toBe(0);
  });
});

describe("derivedBalanceCents", () => {
  // The reported bug: confirmed $814.81 on 15 Jul, then ~$443.22 of
  // reimbursements paid. The headline must reflect the reimbursements.
  it("reflects reimbursements paid since confirmation", () => {
    const atConfirmation = [e({ amount_cents: 100_000 })]; // $1000 already out
    const baseline = cumulativeCashOutCents(atConfirmation); // 100000

    const afterReimbursements: CashOutExpense[] = [
      ...atConfirmation,
      e({ amount_cents: 20_000, paid_by: "justin", reimbursed: true }),
      e({ amount_cents: 24_322, paid_by: "rowan", reimbursed: true }),
    ];

    expect(cashOutSinceBaselineCents(afterReimbursements, baseline)).toBe(44_322);
    // 81481 - 44322 = 37159 -> $371.59, not the stale $814.81
    expect(derivedBalanceCents(81_481, afterReimbursements, baseline)).toBe(37_159);
  });

  it("reconciling resets the since-counter to zero", () => {
    const expenses: CashOutExpense[] = [
      e({ amount_cents: 100_000 }),
      e({ amount_cents: 44_322, paid_by: "justin", reimbursed: true }),
    ];
    const newBaseline = cumulativeCashOutCents(expenses);
    expect(cashOutSinceBaselineCents(expenses, newBaseline)).toBe(0);
    // Right after a reconcile the headline equals the freshly confirmed figure.
    expect(derivedBalanceCents(37_159, expenses, newBaseline)).toBe(37_159);
  });

  it("can go negative when overdrawn and is not clamped", () => {
    expect(derivedBalanceCents(1_000, [e({ amount_cents: 5_000 })], 0)).toBe(-4_000);
  });
});
