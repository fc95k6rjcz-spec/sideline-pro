-- ============================================================
-- Sideline Pro: invoice auto-issue (auto-draft + remind)
--
-- Marks a recurring invoice series and lets a daily cron draft the next
-- invoice when it falls due, then email the user to review & send it.
-- Nothing is sent to the client automatically.
--
--   auto_issue          — this invoice is the recurrence anchor for a series
--   next_invoice_date    — (already existed) when the next draft is due
--   is_draft            — a cron-created invoice awaiting review & send
-- ============================================================

alter table public.invoices
  add column if not exists auto_issue boolean not null default false,
  add column if not exists is_draft boolean not null default false;

-- Cron scans anchors by due date.
create index if not exists invoices_auto_issue_due_idx
  on public.invoices (next_invoice_date)
  where auto_issue = true;
