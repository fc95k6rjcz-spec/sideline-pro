-- ============================================================
-- Sideline Pro: demo_requests (Book-a-demo form on sidelinepro.com.au)
-- Run this entire block in the Supabase SQL editor.
-- Re-running is safe — uses CREATE TABLE IF NOT EXISTS.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.demo_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  club         text,
  email        text,
  phone        text,
  players      text,
  message      text,
  source       text default 'website',
  created_at   timestamptz not null default now()
);

create index if not exists demo_requests_email_idx
  on public.demo_requests (email);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

-- Quick browsing view in Sydney time
create or replace view public.demo_requests_recent as
select
  to_char(created_at at time zone 'Australia/Sydney', 'YYYY-MM-DD HH24:MI') as when_syd,
  name,
  club,
  email,
  phone,
  players,
  message
from public.demo_requests
order by created_at desc;

-- ============================================================
-- Quick queries you can run any time
-- ============================================================
-- How many requests have we had?
--   select count(*) from public.demo_requests;
--
-- Latest 10 with all detail:
--   select * from public.demo_requests order by created_at desc limit 10;
--
-- The browsing view in Sydney time:
--   select * from public.demo_requests_recent limit 25;
