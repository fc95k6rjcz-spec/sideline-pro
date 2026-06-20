-- ============================================================
-- Sideline Pro: business_state — snapshot baseline
--
-- Stores the cumulative cash-out total at the moment the user
-- last set the bank balance. "Recent cash out" is then computed
-- as (current cumulative cash-out) − (baseline at last reset).
--
-- This makes the calculation deterministic and robust to edits
-- that bump rows' updated_at timestamps for unrelated reasons.
-- ============================================================

alter table public.business_state
  add column if not exists snapshot_baseline_cents bigint not null default 0;
