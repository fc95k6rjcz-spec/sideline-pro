/**
 * Cash-out accounting — the single definition of "money that has left the
 * business account", shared by the Expenses dashboard and the reconcile route.
 *
 * The headline bank balance is always DERIVED:
 *   derived = last confirmed balance − (cumulative cash-out − baseline)
 *
 * The baseline is the cumulative cash-out recorded at the last reconcile, so
 * the subtraction only covers spend since that confirmation. Both sides must
 * agree on the cumulative figure or the baseline reset skews permanently —
 * hence this shared module rather than two parallel implementations.
 */

export type CashOutExpense = {
  amount_cents: number;
  status: string | null;
  paid_by: string | null;
  reimbursed: boolean | null;
};

/**
 * Cumulative cash-out across all time. Two ways money leaves the account:
 *   - a Business-paid expense (status defaults to "paid" for legacy rows)
 *   - reimbursing someone who paid personally — the payment out is the
 *     reimbursement, not the original expense
 */
export function cumulativeCashOutCents(expenses: CashOutExpense[]): number {
  return expenses.reduce((acc, e) => {
    const status = e.status ?? "paid";
    const isBusinessSpend = status === "paid" && e.paid_by === "business";
    const isReimbursementPaid = Boolean(e.reimbursed) && e.paid_by !== "business";
    return isBusinessSpend || isReimbursementPaid ? acc + e.amount_cents : acc;
  }, 0);
}

/** Cash out since the last reconcile. Never negative — a stale or over-large
 *  baseline should read as "nothing since", not as free money. */
export function cashOutSinceBaselineCents(
  expenses: CashOutExpense[],
  baselineCents: number,
): number {
  return Math.max(0, cumulativeCashOutCents(expenses) - baselineCents);
}

/** The headline figure: confirmed balance minus what has gone out since. */
export function derivedBalanceCents(
  confirmedBalanceCents: number,
  expenses: CashOutExpense[],
  baselineCents: number,
): number {
  return (
    confirmedBalanceCents - cashOutSinceBaselineCents(expenses, baselineCents)
  );
}
