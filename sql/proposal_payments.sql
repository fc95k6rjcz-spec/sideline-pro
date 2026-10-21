-- ============================================================
-- Sideline Pro: taking payment when a club accepts a proposal
--
-- Acceptance and payment are deliberately SEPARATE. A committee can
-- accept — which is the legal record of who agreed, from where, and to
-- what — and the money can still fail days later. BECS direct debit is
-- asynchronous: the mandate is signed immediately, the funds settle in
-- about three business days, and a failure surfaces after that. So the
-- proposal keeps its own acceptance record and gains a payment state
-- beside it, rather than one column trying to mean both.
--
-- Same conventions as proposals.sql: RLS on with no policies, every
-- read and write through the service role from the app.
--
-- NOTE for anything created here from 30 Oct 2026 onwards: Supabase no
-- longer grants Data API access to new tables automatically. These are
-- ALTERs on an existing table, so they inherit what proposals already
-- has and need nothing. A brand new table would need its own grants.
-- ============================================================

alter table public.proposals
  -- Stripe's own ids, so a payment can always be traced back from the
  -- Dashboard to the club and the quote it belongs to.
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_session_id       text,
  add column if not exists stripe_subscription_id  text,
  -- 'unpaid' | 'processing' | 'paid' | 'failed'.
  -- 'processing' is the one that matters: a BECS mandate is signed and
  -- the money is in flight. Treating that as paid is how a club gets a
  -- welcome email for a debit that later bounces.
  add column if not exists payment_status          text not null default 'unpaid',
  add column if not exists payment_method_kind     text,
  add column if not exists paid_at                 timestamptz,
  add column if not exists payment_failed_at       timestamptz,
  add column if not exists payment_failure_reason  text,
  -- What was actually charged, in cents, as Stripe reported it — not what
  -- the quote said. The two should agree; when they do not, this is the
  -- one that was really taken off the club.
  add column if not exists amount_paid_cents       integer;

-- One Checkout session per proposal at a time; the id is how the webhook
-- finds its way back from Stripe to the row.
create unique index if not exists proposals_stripe_session_id_key
  on public.proposals (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists proposals_payment_status_idx
  on public.proposals (payment_status)
  where payment_status <> 'paid';

comment on column public.proposals.payment_status is
  'unpaid | processing | paid | failed. processing = BECS mandate signed, funds in flight (~3 business days). Never treat processing as paid.';
