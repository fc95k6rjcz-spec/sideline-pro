-- ============================================================
-- Sideline Pro: prospects — add date_emailed + correspondence
-- Run this in the Supabase SQL editor.
-- ============================================================

alter table public.prospects
  add column if not exists date_emailed   date,
  add column if not exists correspondence text;
