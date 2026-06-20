-- ============================================================
-- Sideline Pro: prospects — add follow_up_date
-- Set this column on any row that needs your attention.
-- The grid will highlight rows where the date is today or past
-- (overdue, red) or within the next 7 days (upcoming, amber).
-- ============================================================

alter table public.prospects
  add column if not exists follow_up_date date;

create index if not exists prospects_follow_up_date_idx
  on public.prospects (follow_up_date);
