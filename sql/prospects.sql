-- ============================================================
-- Sideline Pro: prospects (sales pipeline)
-- Run this entire block in the Supabase SQL editor.
-- Re-running is safe; it deletes prior rows with the same club_name
-- before re-inserting.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.prospects (
  id                     uuid primary key default gen_random_uuid(),
  club_name              text not null,
  club_website           text,
  website_quality        text,
  website_functionality  text,
  approx_players         text,
  paid_umpires           text,
  treasurer_name         text,
  treasurer_email        text,
  treasurer_phone        text,
  target                 text,
  notes                  text,
  status                 text default 'New',
  assigned_to            text,
  last_contacted         date,
  next_action            text,
  created_by_email       text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists prospects_club_name_idx on public.prospects (club_name);
create index if not exists prospects_status_idx    on public.prospects (status);
create index if not exists prospects_target_idx    on public.prospects (target);

delete from public.prospects where club_name in (
  'Allambie Netball Club',
  'Belrose Netball Club',
  'Collaroy Plateau Netball Club',
  'Comets Northern Beaches',
  'Cromer Netball Club',
  'Curl Curl Sports Netball Club',
  'Dee Why Beach Netball Club',
  'Forest Netball Club',
  'Mona Vale Commodores Netball Club',
  'Narrabeen Youth Club',
  'Narraweena Netball',
  'Newport Breakers',
  'Pittwater House',
  'Pittwater Peninsula Netball Club',
  'Queenscliff Netball Club',
  'Seaforth Netball Club',
  'Wakehurst Netball Club'
);

insert into public.prospects (
  club_name, club_website, website_quality, website_functionality,
  approx_players, paid_umpires, treasurer_name, treasurer_email,
  treasurer_phone, target, notes, status
) values
  ('Allambie Netball Club', 'www.allambienetball.com.au', 'High', 'Low', '~150-250 (est; self-described ''small club'')', 'Yes', 'Cathy Priebbenow', 'allambietreasurer@gmail.com', 'Not published (club reg: 0419 501 838)', 'No', 'Stale content (2025 events, 2021 PDFs); PlayHQ rego', 'New'),
  ('Belrose Netball Club', 'www.belrosenetball.com', 'Low', 'Low', '~200-300 (est; no count published)', 'Yes', 'Janae Goodall', 'belrosenetball@hotmail.com (club inbox)', 'Not published', 'No', 'Wix site; 50-yr-old club; PlayHQ rego', 'New'),
  ('Collaroy Plateau Netball Club', 'www.cpnetball.com.au', 'Medium', 'Medium', '~200+ (est; founding MWNA club)', 'Yes (umpires 12+ paid)', 'Ana Parker / Dale Hayes (2 listed)', 'Not published (contact form only)', 'Not published', 'No', 'Messy homepage (duplicate rego blocks); PlayHQ rego', 'New'),
  ('Comets Northern Beaches', 'www.cometsnorthernbeachesnetball.com.au', 'Low', 'Low', '~60-100 (7 winter + 4 spring teams 2025)', 'Unknown (volunteer-focused)', 'Not published (Sec: Michele McKay)', 'cometsnbnc1979@gmail.com (club)', '0419 693 683 (secretary)', 'No', 'Seniors club; contacts page is an unreadable image', 'New'),
  ('Cromer Netball Club', 'www.cromernetballclub.com.au', 'Low', 'Medium', '~150-250 (est; no count published)', 'Unknown', 'Belinda Fletcher', 'cromernetballtreasurer@gmail.com', 'Not published', 'No', 'Dated WP site, COVID banner still up in 2026', 'New'),
  ('Curl Curl Sports Netball Club', 'www.curlcurlsportsnetball.asn.au', 'Low', 'Medium', '~400-550 (est; ''largest club on Northern Beaches'')', 'No (umpire-your-own policy)', 'Sue New', 'treasurer@curlcurlsportsnetball.asn.au', 'Not published', 'Yes', 'Dated MyClubMate template (c2019), placeholder pages', 'New'),
  ('Dee Why Beach Netball Club', 'www.facebook.com/DeeWhyBeachNetballClub/', 'Low', 'Low', '~20-50 (seniors-only, est)', 'Unknown', 'Not published', 'deewhybeachnetballclub@outlook.com', 'Not published', 'No', 'Facebook only; rego by email (Mimidel@optusnet.com.au)', 'New'),
  ('Forest Netball Club', 'www.forestnetball.com.au', 'Low', 'Low', '~250-350 (est; 60-yr club, full structure)', 'Yes ($15-$45/game program)', 'Yvonne West (also Registrar)', 'forestnetballregistrar@gmail.com', 'Not published', 'Maybe', 'Modern Wix site; possibly 300+ but unconfirmed', 'New'),
  ('Mona Vale Commodores Netball Club', 'www.monavalecommodores.com.au', 'Low', 'Medium', '~100-180 (est; small club, many vacancies)', 'No (umpire-your-own)', 'Vacant (last: Jen Fitzpatrick 2023)', 'Jenfitzy0873@outlook.com (2023; club: monavalecommodores@gmail.com)', 'Pres. Robyn Armsworth-Brack 0434 954 261', 'No', 'Treasurer role vacant on committee page', 'New'),
  ('Narrabeen Youth Club', 'www.nycnetball.com.au', 'Medium', 'High', '~315-360 (35-40 teams in 2024 per site)', 'Yes (MWNA $15-$45/game)', 'Sarah Jacobs', 'nycnetballtreasurer@gmail.com', 'Not published (Pres: 0413 275 007)', 'Maybe', '300+ players but site is functional (Weebly, dated look)', 'New'),
  ('Narraweena Netball', 'www.facebook.com/narraweenanetball/', 'Low', 'Low', 'Not found (likely small)', 'Unknown', 'Not published', 'Not published', 'Not published', 'No', 'Facebook only; near-zero online footprint', 'New'),
  ('Newport Breakers', 'www.newportbreakersnetball.com.au', 'Medium', 'Medium', '~90-180 (est; 10-20 teams)', 'Unknown', 'No treasurer listed (Sec: Shonagh Wheeler)', 'secretarynbnc@gmail.com (secretary)', 'Not published', 'No', 'JS-rendered WP site; committee role emails on contact page', 'New'),
  ('Pittwater House', 'www.pittwaterhouse.com.au', 'High', 'Low', '~45-90 (school teams, est)', 'Unknown', 'N/A (school program)', 'N/A (reception +61 2 9981 4400)', '+61 2 9981 4400', 'No', 'Private school; netball run via school sport program', 'New'),
  ('Pittwater Peninsula Netball Club', 'www.peninsulanetball.org.au', 'Medium', 'Medium', '~436 members (stated on club site)', 'Yes (PNUA pool, ~$45/game)', 'Pip Prentice', 'treasurerppnetballclub@gmail.com', '0420 904 050', 'Maybe', '436 players; site mediocre (JS-only, ''Website Title'' bug) but not ''crap''', 'New'),
  ('Queenscliff Netball Club', 'www.queenscliffnetball.asn.au', 'Low', 'Low', '~300-450 (est; ''one of largest in MWNA'')', 'Yes (paid pool, direct payment)', 'Brigette Bankes (Luke Geddes outdated)', 'qnctreasurer@gmail.com', 'Not published (Umpires: Gill Fogarty 0412 804 311)', 'Yes', 'Very stale site (2020 umpiring page, Feb 2025 calendar)', 'New'),
  ('Seaforth Netball Club', 'www.seaforthnetball.com.au', 'High', 'High', '~400', 'Yes (confirmed, by badge level)', 'Sarah Cartwright (Tai Ifopo is President)', 'Not published (sec: seaforthsecretary@gmail.com)', 'Not published (club policy)', 'No', 'Modern Next.js site with portals; best site in MWNA', 'New'),
  ('Wakehurst Netball Club', 'www.wakehurstnetball.com.au', 'Medium', 'Medium', '~400 (''close to 400 players and members'')', 'Unknown', 'Chris Mottrom', 'treasurer@wakehurstnetball.com.au', 'Not published (Sec: 0414 922 933)', 'Maybe', '400 players; Wix site OK but key info buried in PDFs', 'New');
