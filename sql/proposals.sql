-- ============================================================
-- Sideline Pro: proposals a club can read and accept online
--
-- Applied to the SidelinePro_Website project on 14 Oct 2026
-- (migration "proposals_accept_online"). Kept here as the record.
--
-- One row per proposal link. The token in the URL is the only secret;
-- every read and write goes through the service role from the app
-- (admin routes and the public /proposal/<token> page), so RLS is on
-- with no policies.
-- ============================================================

create table if not exists public.proposals (
  id                  uuid primary key default gen_random_uuid(),
  prospect_id         uuid references public.prospects(id) on delete set null,
  token               text not null unique,
  club_name           text not null,
  title               text not null,
  headline            text,
  intro               text,
  -- [{ "title": "Club website", "detail": "…" }]
  includes            jsonb not null default '[]'::jsonb,
  -- [{ "label": "Platform licence", "amount_cents": 150000, "period": "year", "note": "…" }]
  pricing             jsonb not null default '[]'::jsonb,
  terms               text,
  pdf_url             text,
  valid_until         date,
  status              text not null default 'draft',
  sent_at             timestamptz,
  first_viewed_at     timestamptz,
  last_viewed_at      timestamptz,
  view_count          integer not null default 0,
  accepted_at         timestamptz,
  accepted_name       text,
  accepted_role       text,
  accepted_email      text,
  accepted_note       text,
  accepted_ip         text,
  accepted_user_agent text,
  declined_at         timestamptz,
  declined_reason     text,
  created_by_email    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint proposals_status_check check (status in ('draft','sent','viewed','accepted','declined'))
);

create index if not exists proposals_prospect_idx on public.proposals (prospect_id);
create index if not exists proposals_status_idx on public.proposals (status);

alter table public.proposals enable row level security;
