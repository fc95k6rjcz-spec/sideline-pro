-- Void an invoice without deleting it: the number stays on record (no gaps in
-- the SNC-2026-xxx sequence), but a void row is excluded from outstanding,
-- GST, reminders and auto-issue. Applied 30 Oct 2026; SNC-2026-017 voided.
alter table public.invoices
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;
