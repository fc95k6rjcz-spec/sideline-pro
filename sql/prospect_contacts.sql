-- ============================================================
-- Sideline Pro: prospects — club logos, colours, region, and every
-- contact from the NSW netball contacts research sheet.
-- Run in the Supabase SQL editor. Re-running is safe.
--
-- The contacts themselves are loaded with prospect_contacts_load() below
-- from the research spreadsheet.
-- ============================================================

alter table public.prospects
  add column if not exists region        text,
  -- Path under /public, e.g. /prospect-logos/central-netball-club.png
  add column if not exists logo_url      text,
  -- 'dark' for white logos that vanish on a white tile
  add column if not exists logo_bg       text,
  add column if not exists brand_color   text,
  add column if not exists brand_color_2 text;

create table if not exists public.prospect_contacts (
  id                      uuid primary key default gen_random_uuid(),
  prospect_id             uuid not null references public.prospects(id) on delete cascade,
  -- Which tab of the research sheet the row came from:
  -- 'contacts' (campaign list), 'research_gap' (name found, no email),
  -- 'other_phone' (published club phone, not a campaign contact)
  source_sheet            text not null default 'contacts',
  role                    text,
  contact_name            text,
  email                   text,
  greeting                text,
  campaign_segment        text,
  buying_role             text,
  mailbox_type            text,
  evidence                text,
  source_url              text,
  contact_quality         text,
  consent_assessment      text,
  opt_out_status          text,
  notes                   text,
  mobile                  text,
  published_phone_contact text,
  phone_attribution       text,
  mobile_source_url       text,
  mobile_checked          text,
  email_status            text,
  next_check              text,
  created_at              timestamptz not null default now()
);

create index if not exists prospect_contacts_prospect_idx on public.prospect_contacts (prospect_id);

-- Same posture as prospects: RLS on, no policies; the admin API reads
-- with the service role after checking the signed-in email.
alter table public.prospect_contacts enable row level security;

-- Loader used for the 22 Oct 2026 import. Each row is a JSON array:
-- [club, source_sheet, role, contact_name, email, greeting, campaign_segment,
--  buying_role, mailbox_type, evidence, source_url, contact_quality,
--  consent_assessment, opt_out_status, notes, mobile, published_phone_contact,
--  phone_attribution, mobile_source_url, mobile_checked, email_status, next_check]
-- The contact data itself is not kept in git; it comes from the research
-- spreadsheet (SidelinePro_NSW_Netball_Contacts_With_Mobiles.xlsx).
create or replace function public.prospect_contacts_load(rows jsonb) returns int
language sql set search_path = public as $$
  with ins as (
    insert into public.prospect_contacts (prospect_id, source_sheet, role, contact_name, email, greeting, campaign_segment,
      buying_role, mailbox_type, evidence, source_url, contact_quality, consent_assessment, opt_out_status, notes, mobile,
      published_phone_contact, phone_attribution, mobile_source_url, mobile_checked, email_status, next_check)
    select (select id from public.prospects p where lower(p.club_name) = lower(x->>0) limit 1),
      x->>1, x->>2, x->>3, x->>4, x->>5, x->>6, x->>7, x->>8, x->>9, x->>10, x->>11, x->>12, x->>13, x->>14, x->>15,
      x->>16, x->>17, x->>18, x->>19, x->>20, x->>21
    from jsonb_array_elements(rows) x
    returning 1
  ) select count(*)::int from ins
$$;
revoke all on function public.prospect_contacts_load(jsonb) from public, anon, authenticated;
