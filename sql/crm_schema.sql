-- ============================================================
-- Sideline Pro CRM: associations, clubs, people, committee roles
--
-- Applied to the SidelinePro_Website project as migration
-- "crm_schema". Kept here as the record.
--
-- This Supabase project is shared with LEX and other apps, so every
-- table is prefixed crm_. RLS is on with NO policies: the anon and
-- authenticated roles cannot read or write anything here. Every read
-- and write goes through the service role from /api/crm/*, which
-- checks the ADMIN_EMAILS allowlist first (same model as proposals).
--
-- Shape:
--   association ──< club_association >── club
--   club ──< appointment >── person         (a person can hold many roles,
--                                            at many clubs, over time)
--   contact_point → person and/or club      (personal email, role inbox,
--                                            general club inbox, phone)
--   club ──< activity, task
--
-- Every researched fact carries source_url + verified_on + verification
-- ('verified' | 'unverified' | 'suggested'). Suggested professional
-- matches live in crm_profile_matches until a person confirms them.
--
-- The campaign tables at the bottom are schema only: nothing in the app
-- sends email yet (Phase 3).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- associations ----------
create table if not exists public.crm_associations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  short_name    text,
  sport         text not null default 'netball',
  state         text not null default 'NSW',
  region        text,
  website       text,
  notes         text,
  source_url    text,
  source_note   text,
  verified_on   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists crm_associations_name_uq
  on public.crm_associations (lower(name));

-- ---------- clubs ----------
create table if not exists public.crm_clubs (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  aliases            text[] not null default '{}',
  sport              text not null default 'netball',
  suburb             text,
  region             text,
  state              text not null default 'NSW',
  website            text,
  -- { "facebook": "...", "instagram": "..." }
  social_links       jsonb not null default '{}'::jsonb,
  approx_players     text,
  approx_teams       integer,
  current_systems    text,
  paid_umpires       text,
  stage              text not null default 'needs_research',
  owner              text,
  feature_interest   text[] not null default '{}',
  pain_points        text,
  demo_on            date,
  proposal_status    text,
  delay_reason       text,
  loss_reason        text,
  notes              text,
  source_url         text,
  source_note        text,
  verified_on        date,
  legacy_prospect_id uuid references public.prospects(id) on delete set null,
  created_by_email   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint crm_clubs_stage_check check (stage in (
    'needs_research','ready','contacted','engaged','demo_booked',
    'proposal','won','lost','nurture'))
);
create index if not exists crm_clubs_stage_idx on public.crm_clubs (stage);
create unique index if not exists crm_clubs_legacy_uq
  on public.crm_clubs (legacy_prospect_id) where legacy_prospect_id is not null;

-- A club can sit in more than one association without being duplicated.
create table if not exists public.crm_club_associations (
  club_id        uuid not null references public.crm_clubs(id) on delete cascade,
  association_id uuid not null references public.crm_associations(id) on delete cascade,
  verification   text not null default 'unverified',
  source_url     text,
  source_note    text,
  verified_on    date,
  created_at     timestamptz not null default now(),
  primary key (club_id, association_id),
  constraint crm_club_assoc_verif_check check (verification in ('verified','unverified','suggested'))
);
create index if not exists crm_club_associations_assoc_idx
  on public.crm_club_associations (association_id);

-- ---------- people ----------
create table if not exists public.crm_people (
  id                   uuid primary key default gen_random_uuid(),
  full_name            text not null,
  preferred_name       text,
  location             text,
  -- Professional background. Only confirmed values belong here;
  -- unreviewed candidates sit in crm_profile_matches.
  linkedin_url         text,
  employer             text,
  job_title            text,
  industry             text,
  -- technology | finance | operations | project_management | business_owner | other
  background_tags      text[] not null default '{}',
  professional_source  text,
  professional_verified_on date,
  champion_status      text not null default 'none',
  -- Communication preferences
  preferred_channel    text,
  do_not_contact       boolean not null default false,
  unsubscribed_at      timestamptz,
  notes                text,
  source_url           text,
  source_note          text,
  verified_on          date,
  verification         text not null default 'unverified',
  created_by_email     text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint crm_people_champion_check check (champion_status in ('none','potential','confirmed')),
  constraint crm_people_verif_check check (verification in ('verified','unverified','suggested'))
);
create index if not exists crm_people_name_idx on public.crm_people (lower(full_name));

-- ---------- committee appointments ----------
-- person_id is null only for an explicitly vacant role.
create table if not exists public.crm_appointments (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.crm_clubs(id) on delete cascade,
  person_id        uuid references public.crm_people(id) on delete cascade,
  role_category    text not null,
  original_title   text,
  responsibilities text,
  status           text not null default 'current',
  season           text,
  started_on       date,
  ended_on         date,
  -- decision_maker | user_admin | champion | influencer | unknown
  purchase_roles   text[] not null default '{}',
  replaced_by_id   uuid references public.crm_appointments(id) on delete set null,
  notes            text,
  source_url       text,
  source_note      text,
  verified_on      date,
  verification     text not null default 'unverified',
  created_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint crm_appt_status_check check (status in ('current','former','unverified','vacant')),
  constraint crm_appt_verif_check check (verification in ('verified','unverified','suggested')),
  constraint crm_appt_person_check check (person_id is not null or status = 'vacant')
);
create index if not exists crm_appointments_club_idx   on public.crm_appointments (club_id);
create index if not exists crm_appointments_person_idx on public.crm_appointments (person_id);
create index if not exists crm_appointments_role_idx   on public.crm_appointments (role_category, status);

-- ---------- contact points ----------
-- One row per email address or phone number.
--   personal : the person's own address           (person_id set)
--   role     : treasurer@club — belongs to the role, not the person
--              (club_id + role_category; person_id optional = current holder)
--   general  : info@club / the club inbox         (club_id set)
--   work     : found during professional research — never used for
--              outreach unless someone deliberately sets outreach_ok.
create table if not exists public.crm_contact_points (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid references public.crm_people(id) on delete cascade,
  club_id        uuid references public.crm_clubs(id) on delete cascade,
  kind           text not null,
  value          text not null,
  value_norm     text not null,
  inbox_type     text not null default 'personal',
  role_category  text,
  label          text,
  status         text not null default 'active',
  outreach_ok    boolean not null default true,
  source_url     text,
  source_note    text,
  verified_on    date,
  verification   text not null default 'unverified',
  created_by_email text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint crm_cp_kind_check   check (kind in ('email','phone')),
  constraint crm_cp_inbox_check  check (inbox_type in ('personal','role','general','work')),
  constraint crm_cp_status_check check (status in ('active','bounced','invalid','stale')),
  constraint crm_cp_verif_check  check (verification in ('verified','unverified','suggested')),
  constraint crm_cp_owner_check  check (person_id is not null or club_id is not null)
);
create index if not exists crm_contact_points_value_idx  on public.crm_contact_points (kind, value_norm);
create index if not exists crm_contact_points_person_idx on public.crm_contact_points (person_id);
create index if not exists crm_contact_points_club_idx   on public.crm_contact_points (club_id);
create unique index if not exists crm_contact_points_uq on public.crm_contact_points (
  kind, value_norm,
  coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(club_id,   '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------- activity ----------
create table if not exists public.crm_activities (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.crm_clubs(id) on delete cascade,
  person_ids       uuid[] not null default '{}',
  kind             text not null,
  direction        text,
  outcome          text,
  occurred_at      timestamptz not null default now(),
  subject          text,
  body             text,
  feature_interest text[] not null default '{}',
  pain_points      text,
  campaign_id      uuid,
  gmail_thread_id  text,
  gmail_message_id text,
  created_by_email text,
  created_at       timestamptz not null default now(),
  constraint crm_act_kind_check check (kind in ('email','call','meeting','note','demo','proposal','stage_change')),
  constraint crm_act_dir_check  check (direction is null or direction in ('outbound','inbound')),
  constraint crm_act_outcome_check check (outcome is null or outcome in (
    'no_response','replied','left_message','connected','interested','not_interested','bounced'))
);
create index if not exists crm_activities_club_idx on public.crm_activities (club_id, occurred_at desc);

-- ---------- tasks / follow-ups ----------
create table if not exists public.crm_tasks (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.crm_clubs(id) on delete cascade,
  person_id        uuid references public.crm_people(id) on delete set null,
  title            text not null,
  due_on           date,
  owner            text,
  status           text not null default 'open',
  completed_at     timestamptz,
  created_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint crm_task_status_check check (status in ('open','done','cancelled'))
);
create index if not exists crm_tasks_open_idx on public.crm_tasks (status, due_on);
create index if not exists crm_tasks_club_idx on public.crm_tasks (club_id);

-- ---------- provenance ----------
-- Append-only: every create/update/delete the app makes, with the old and
-- new values and where the information came from.
create table if not exists public.crm_change_log (
  id          bigint generated always as identity primary key,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  changes     jsonb not null default '{}'::jsonb,
  source_url  text,
  source_note text,
  import_id   uuid,
  actor_email text,
  at          timestamptz not null default now()
);
create index if not exists crm_change_log_entity_idx on public.crm_change_log (entity, entity_id, at desc);

create table if not exists public.crm_imports (
  id          uuid primary key default gen_random_uuid(),
  filename    text,
  source_label text,
  row_count   integer not null default 0,
  mapping     jsonb not null default '{}'::jsonb,
  summary     jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at  timestamptz not null default now()
);

-- ---------- research (Phase 2) ----------
create table if not exists public.crm_profile_matches (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.crm_people(id) on delete cascade,
  profile_url    text not null,
  proposed       jsonb not null default '{}'::jsonb,   -- {employer, job_title, industry, location}
  evidence       jsonb not null default '[]'::jsonb,   -- [{signal, detail, url}]
  conflicts      jsonb not null default '[]'::jsonb,
  confidence     text not null default 'low',
  confidence_reasons text,
  status         text not null default 'pending',
  reviewed_by    text,
  reviewed_at    timestamptz,
  search_method  text,
  limitations    text,
  created_at     timestamptz not null default now(),
  constraint crm_pm_conf_check   check (confidence in ('low','medium','high')),
  constraint crm_pm_status_check check (status in ('pending','confirmed','rejected','unresolved'))
);
create index if not exists crm_profile_matches_person_idx on public.crm_profile_matches (person_id);

-- ---------- audiences + campaigns (audiences used now; campaigns Phase 3) ----------
create table if not exists public.crm_audiences (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  filters     jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.crm_suppressions (
  id          uuid primary key default gen_random_uuid(),
  email_norm  text not null unique,
  reason      text not null,   -- unsubscribed | bounced | manual | complaint
  person_id   uuid references public.crm_people(id) on delete set null,
  note        text,
  created_by_email text,
  created_at  timestamptz not null default now()
);

create table if not exists public.crm_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  audience_id   uuid references public.crm_audiences(id) on delete set null,
  role_category text,
  subject       text,
  body_template text,
  status        text not null default 'draft',
  -- Sending stays off until someone deliberately flips this per campaign.
  live_send_enabled boolean not null default false,
  test_recipients text[] not null default '{}',
  daily_limit   integer not null default 50,
  follow_up_rules jsonb not null default '[]'::jsonb,
  approved_by   text,
  approved_at   timestamptz,
  created_by_email text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint crm_campaign_status_check check (status in ('draft','approved','sending','sent','paused','cancelled'))
);

create table if not exists public.crm_campaign_recipients (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references public.crm_campaigns(id) on delete cascade,
  email_norm       text not null,
  contact_point_id uuid references public.crm_contact_points(id) on delete set null,
  person_id        uuid references public.crm_people(id) on delete set null,
  club_ids         uuid[] not null default '{}',
  role_categories  text[] not null default '{}',
  rendered_subject text,
  rendered_body    text,
  status           text not null default 'pending',
  gmail_message_id text,
  gmail_thread_id  text,
  sent_at          timestamptz,
  replied_at       timestamptz,
  bounced_at       timestamptz,
  excluded_reason  text,
  created_at       timestamptz not null default now(),
  unique (campaign_id, email_norm),
  constraint crm_cr_status_check check (status in ('pending','excluded','sent','replied','bounced','unsubscribed','failed'))
);

-- ---------- RLS: on, no policies (service role only) ----------
alter table public.crm_associations        enable row level security;
alter table public.crm_clubs               enable row level security;
alter table public.crm_club_associations   enable row level security;
alter table public.crm_people              enable row level security;
alter table public.crm_appointments        enable row level security;
alter table public.crm_contact_points      enable row level security;
alter table public.crm_activities          enable row level security;
alter table public.crm_tasks               enable row level security;
alter table public.crm_change_log          enable row level security;
alter table public.crm_imports             enable row level security;
alter table public.crm_profile_matches     enable row level security;
alter table public.crm_audiences           enable row level security;
alter table public.crm_suppressions        enable row level security;
alter table public.crm_campaigns           enable row level security;
alter table public.crm_campaign_recipients enable row level security;
