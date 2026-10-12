-- ============================================================
-- Sideline Pro: payment reminders (2 Sep 2026)
--
-- "Resend" re-sent the original invoice email verbatim, which reads oddly as
-- a nudge. The ledger now has a Remind / Follow-up action that sends a
-- gentle, tone-appropriate email (pre-due vs overdue) and records it here so
-- the admin can see when the client was last nudged.
--
--   reminder_sent_at — last reminder/follow-up email timestamp
--   reminder_count   — how many reminders have gone out for this invoice
-- ============================================================

alter table public.invoices
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_count integer not null default 0;
