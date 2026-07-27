-- ============================================================
-- Sideline Pro: business_state — manually-confirmed snapshot
--
-- account_balance_cents is a LIVE figure: marking an invoice paid
-- auto-bumps it (see PATCH /api/invoices/[id]). These two columns
-- record the balance the user last *manually* confirmed and when —
-- they are written only by a manual reconcile (PATCH /api/business-state),
-- never by an auto-bump. The "Confirmed $X on <date>" label reads them
-- so it reflects the last human confirmation, not an automatic event.
--
-- Nullable: legacy rows fall back to account_balance_cents /
-- account_balance_updated_at until the next manual reconcile.
-- ============================================================

alter table public.business_state
  add column if not exists balance_confirmed_cents bigint,
  add column if not exists balance_confirmed_at timestamptz;
