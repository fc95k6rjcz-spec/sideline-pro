-- ============================================================
-- Sideline Pro CRM: one-off move of the 18 rows in public.prospects
-- into the CRM model. Applied as migration "crm_seed_from_prospects".
--
-- Written by hand, row by row, because the old sheet packed several
-- facts into one cell ("Sarah Cartwright (Tai Ifopo is President)",
-- "Vacant (last: Jen Fitzpatrick 2023)"). Rules followed:
--   * Nothing invented. "Not published", "N/A", "Unknown" become nulls.
--   * A name the sheet calls outdated is recorded as a FORMER appointment.
--   * Two names listed for one role → both kept, marked unverified.
--   * Club-association links are unverified unless an internal record
--     confirms them (Seaforth: the invoicing client record).
--   * Facts the sheet stated plainly are 'verified' against the club
--     website on 2026-06-03 (the date the sheet was loaded). Everything
--     here predates the 2026/27 AGM season, so the app flags it stale.
--   * public.prospects is left untouched; every club keeps
--     legacy_prospect_id so proposals.prospect_id still resolves.
-- Re-running is a no-op: it stops if the seed has already been applied.
-- ============================================================

do $$
declare
  mwna uuid;
  c uuid;           -- current club
  p uuid;           -- current person
  p2 uuid;
  a uuid;
  src constant text := 'Legacy prospects sheet (club website research, loaded 3 Jun 2026)';
  d constant date := date '2026-06-03';
begin
  if exists (select 1 from public.crm_clubs where legacy_prospect_id is not null) then
    raise notice 'crm seed already applied — skipping';
    return;
  end if;

  insert into public.crm_associations (name, short_name, state, region, source_note)
  values ('Manly Warringah Netball Association', 'MWNA', 'NSW', 'Northern Beaches',
          'Named in the legacy prospects sheet and on the Seaforth client record')
  returning id into mwna;

  -- ---------------- Allambie ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Allambie Netball Club', 'Northern Beaches', 'www.allambienetball.com.au',
          '~150-250 (est; self-described ''small club'')', 'Yes',
          'Stale content (2025 events, 2021 PDFs); PlayHQ rego. Website quality High / functionality Low. Legacy target flag: No.',
          'ready', 'www.allambienetball.com.au', src, d, '341cfa42-f7d2-4f2b-b7d1-324c95c3ae85')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Cathy Priebbenow', 'verified', 'www.allambienetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.allambienetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'allambietreasurer@gmail.com', 'allambietreasurer@gmail.com', 'role', 'treasurer', 'verified', 'www.allambienetball.com.au', src, d),
         (c, null, 'phone', '0419 501 838', '0419501838', 'role', 'registrar', 'verified', 'www.allambienetball.com.au', src, d);
  update public.crm_contact_points set label = 'Club registrations line' where club_id = c and kind = 'phone';

  -- ---------------- Belrose ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Belrose Netball Club', 'Northern Beaches', 'www.belrosenetball.com',
          '~200-300 (est; no count published)', 'Yes',
          'Wix site; 50-yr-old club; PlayHQ rego. Website quality Low / functionality Low. Legacy target flag: No.',
          'needs_research', 'www.belrosenetball.com', src, d, 'f99e72b2-2677-477e-b99d-e732e71ff489')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Janae Goodall', 'verified', 'www.belrosenetball.com', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.belrosenetball.com', src, d);
  insert into public.crm_contact_points (club_id, kind, value, value_norm, inbox_type, label, verification, source_url, source_note, verified_on)
  values (c, 'email', 'belrosenetball@hotmail.com', 'belrosenetball@hotmail.com', 'general', 'Club inbox', 'verified', 'www.belrosenetball.com', src, d);

  -- ---------------- Collaroy Plateau ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Collaroy Plateau Netball Club', 'Northern Beaches', 'www.cpnetball.com.au',
          '~200+ (est; founding MWNA club)', 'Yes (umpires 12+ paid)',
          'Messy homepage (duplicate rego blocks); PlayHQ rego. Treasurer email not published (contact form only). Website quality Medium / functionality Medium. Legacy target flag: No.',
          'needs_research', 'www.cpnetball.com.au', src, d, '97423367-f2a4-4804-9151-70c512cc7921')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src || ' — notes call it a founding MWNA club');
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Ana Parker', 'unverified', 'www.cpnetball.com.au', src, d) returning id into p;
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Dale Hayes', 'unverified', 'www.cpnetball.com.au', src, d) returning id into p2;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, notes, source_url, source_note, verified_on)
  values (c, p,  'treasurer', 'Treasurer', 'unverified', 'unverified', 'Two treasurers listed on the site — confirm which is current.', 'www.cpnetball.com.au', src, d),
         (c, p2, 'treasurer', 'Treasurer', 'unverified', 'unverified', 'Two treasurers listed on the site — confirm which is current.', 'www.cpnetball.com.au', src, d);

  -- ---------------- Comets Northern Beaches ----------------
  insert into public.crm_clubs (name, region, website, approx_players, approx_teams, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Comets Northern Beaches', 'Northern Beaches', 'www.cometsnorthernbeachesnetball.com.au',
          '~60-100 (7 winter + 4 spring teams 2025)', 11, 'Unknown (volunteer-focused)',
          'Seniors club; contacts page is an unreadable image. Treasurer not published. Website quality Low / functionality Low. Legacy target flag: No.',
          'needs_research', 'www.cometsnorthernbeachesnetball.com.au', src, d, 'a1eb6b21-35bf-4e30-9ae2-e4d5926e138d')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Michele McKay', 'verified', 'www.cometsnorthernbeachesnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'secretary', 'Secretary', 'current', 'verified', 'www.cometsnorthernbeachesnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, label, verification, source_url, source_note, verified_on)
  values (c, null, 'email', 'cometsnbnc1979@gmail.com', 'cometsnbnc1979@gmail.com', 'general', null, 'Club inbox', 'verified', 'www.cometsnorthernbeachesnetball.com.au', src, d),
         (c, p, 'phone', '0419 693 683', '0419693683', 'role', 'secretary', 'Published as the secretary''s number', 'verified', 'www.cometsnorthernbeachesnetball.com.au', src, d);

  -- ---------------- Cromer ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Cromer Netball Club', 'Northern Beaches', 'www.cromernetballclub.com.au',
          '~150-250 (est; no count published)', 'Unknown',
          'Dated WP site, COVID banner still up in 2026. Website quality Low / functionality Medium. Legacy target flag: No.',
          'ready', 'www.cromernetballclub.com.au', src, d, '8479b2d0-cc2f-4cd7-9214-29ac9740635d')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Belinda Fletcher', 'verified', 'www.cromernetballclub.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.cromernetballclub.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'cromernetballtreasurer@gmail.com', 'cromernetballtreasurer@gmail.com', 'role', 'treasurer', 'verified', 'www.cromernetballclub.com.au', src, d);

  -- ---------------- Curl Curl ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Curl Curl Sports Netball Club', 'Northern Beaches', 'www.curlcurlsportsnetball.asn.au',
          '~400-550 (est; ''largest club on Northern Beaches'')', 'No (umpire-your-own policy)',
          'Dated MyClubMate template (c2019), placeholder pages. Website quality Low / functionality Medium. Legacy target flag: Yes.',
          'ready', 'www.curlcurlsportsnetball.asn.au', src, d, 'eb77ce32-64bd-47fc-ad43-7eb4d2e5d004')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Sue New', 'verified', 'www.curlcurlsportsnetball.asn.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.curlcurlsportsnetball.asn.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'treasurer@curlcurlsportsnetball.asn.au', 'treasurer@curlcurlsportsnetball.asn.au', 'role', 'treasurer', 'verified', 'www.curlcurlsportsnetball.asn.au', src, d);

  -- ---------------- Dee Why Beach ----------------
  insert into public.crm_clubs (name, region, social_links, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Dee Why Beach Netball Club', 'Northern Beaches',
          '{"facebook":"www.facebook.com/DeeWhyBeachNetballClub/"}'::jsonb,
          '~20-50 (seniors-only, est)', 'Unknown',
          'Facebook only; registration by email. Treasurer not published. Website quality Low / functionality Low. Legacy target flag: No.',
          'needs_research', 'www.facebook.com/DeeWhyBeachNetballClub/', src, d, '4a062070-bb4b-4c35-b0d5-03f6f0e0d9c3')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_contact_points (club_id, kind, value, value_norm, inbox_type, role_category, label, verification, source_url, source_note, verified_on)
  values (c, 'email', 'deewhybeachnetballclub@outlook.com', 'deewhybeachnetballclub@outlook.com', 'general', null, 'Club inbox', 'verified', 'www.facebook.com/DeeWhyBeachNetballClub/', src, d),
         (c, 'email', 'Mimidel@optusnet.com.au', 'mimidel@optusnet.com.au', 'role', 'registrar', 'Registrations (holder not named)', 'unverified', 'www.facebook.com/DeeWhyBeachNetballClub/', src, d);

  -- ---------------- Forest ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Forest Netball Club', 'Northern Beaches', 'www.forestnetball.com.au',
          '~250-350 (est; 60-yr club, full structure)', 'Yes ($15-$45/game program)',
          'Modern Wix site; possibly 300+ but unconfirmed. Website quality Low / functionality Low. Legacy target flag: Maybe.',
          'ready', 'www.forestnetball.com.au', src, d, '06697251-cf82-4723-ab65-cfd0df11e29e')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Yvonne West', 'verified', 'www.forestnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.forestnetball.com.au', src, d),
         (c, p, 'registrar', 'Registrar', 'current', 'verified', 'www.forestnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'forestnetballregistrar@gmail.com', 'forestnetballregistrar@gmail.com', 'role', 'registrar', 'verified', 'www.forestnetball.com.au', src, d);

  -- ---------------- Gazelles (already contacted by Rowan) ----------------
  insert into public.crm_clubs (name, website, approx_players, paid_umpires, notes, stage, owner, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Gazelles', 'https://gazellesnetball.com.au', '400', null,
          'Association not recorded in the legacy sheet. Website quality Medium / functionality Low. Legacy target flag: Yes.',
          'contacted', 'Rowan', 'https://gazellesnetball.com.au', 'Legacy prospects sheet (added 4 Jun 2026)', null,
          '10a92add-56df-4953-a313-71a8511dca22')
  returning id into c;
  insert into public.crm_people (full_name, verification, notes, source_note)
  values ('Peter', 'unverified', 'First name only, from Rowan''s June email to the club president. Surname and email not recorded.',
          'Legacy prospects sheet correspondence') returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, purchase_roles, source_note)
  values (c, p, 'president', 'President', 'current', 'unverified', '{decision_maker}', 'Legacy prospects sheet correspondence');
  insert into public.crm_activities (club_id, person_ids, kind, direction, outcome, occurred_at, subject, body, created_by_email)
  select c, array[p], 'email', 'outbound', 'no_response', timestamptz '2026-06-04 00:50:00+00',
         'Intro email to the president (date approximate — moved from the legacy sheet)',
         correspondence, 'rowan@sidelinepro.com.au'
  from public.prospects where id = '10a92add-56df-4953-a313-71a8511dca22';
  insert into public.crm_tasks (club_id, person_id, title, due_on, owner)
  values (c, p, 'Ring Peter and follow up the intro email', date '2026-06-10', 'Rowan');

  -- ---------------- Mona Vale Commodores ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Mona Vale Commodores Netball Club', 'Northern Beaches', 'www.monavalecommodores.com.au',
          '~100-180 (est; small club, many vacancies)', 'No (umpire-your-own)',
          'Treasurer role vacant on committee page. Website quality Low / functionality Medium. Legacy target flag: No.',
          'needs_research', 'www.monavalecommodores.com.au', src, d, 'f8a2e207-4530-4447-b400-3b64615ce6f8')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Jen Fitzpatrick', 'verified', 'www.monavalecommodores.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, season, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'former', '2023', 'verified', 'www.monavalecommodores.com.au', src, d)
  returning id into a;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, null, 'treasurer', 'Treasurer', 'vacant', 'verified', 'www.monavalecommodores.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, label, status, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'Jenfitzy0873@outlook.com', 'jenfitzy0873@outlook.com', 'personal', 'Listed while treasurer (2023)', 'stale', 'verified', 'www.monavalecommodores.com.au', src, d);
  insert into public.crm_contact_points (club_id, kind, value, value_norm, inbox_type, label, verification, source_url, source_note, verified_on)
  values (c, 'email', 'monavalecommodores@gmail.com', 'monavalecommodores@gmail.com', 'general', 'Club inbox', 'verified', 'www.monavalecommodores.com.au', src, d);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Robyn Armsworth-Brack', 'verified', 'www.monavalecommodores.com.au', src, d) returning id into p2;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, purchase_roles, source_url, source_note, verified_on)
  values (c, p2, 'president', 'President', 'current', 'verified', '{decision_maker}', 'www.monavalecommodores.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p2, 'phone', '0434 954 261', '0434954261', 'role', 'president', 'verified', 'www.monavalecommodores.com.au', src, d);

  -- ---------------- Narrabeen Youth Club ----------------
  insert into public.crm_clubs (name, region, website, approx_players, approx_teams, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Narrabeen Youth Club', 'Northern Beaches', 'www.nycnetball.com.au',
          '~315-360 (35-40 teams in 2024 per site)', null, 'Yes (MWNA $15-$45/game)',
          '300+ players but site is functional (Weebly, dated look). Website quality Medium / functionality High. Legacy target flag: Maybe.',
          'ready', 'www.nycnetball.com.au', src, d, 'fae2b2ad-edf7-46a2-8bd9-a54363b60534')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src || ' — notes reference MWNA umpire rates');
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Sarah Jacobs', 'verified', 'www.nycnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.nycnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, label, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'nycnetballtreasurer@gmail.com', 'nycnetballtreasurer@gmail.com', 'role', 'treasurer', null, 'verified', 'www.nycnetball.com.au', src, d),
         (c, null, 'phone', '0413 275 007', '0413275007', 'role', 'president', 'President (name not recorded)', 'verified', 'www.nycnetball.com.au', src, d);

  -- ---------------- Narraweena ----------------
  insert into public.crm_clubs (name, region, social_links, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Narraweena Netball', 'Northern Beaches',
          '{"facebook":"www.facebook.com/narraweenanetball/"}'::jsonb,
          null, 'Unknown',
          'Facebook only; near-zero online footprint (player count not found, likely small). Website quality Low / functionality Low. Legacy target flag: No.',
          'needs_research', 'www.facebook.com/narraweenanetball/', src, d, 'e22d34b7-f518-442d-960e-b068a0de437f')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);

  -- ---------------- Newport Breakers ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Newport Breakers', 'Northern Beaches', 'www.newportbreakersnetball.com.au',
          '~90-180 (est; 10-20 teams)', 'Unknown',
          'JS-rendered WP site; committee role emails on contact page. No treasurer listed. Website quality Medium / functionality Medium. Legacy target flag: No.',
          'needs_research', 'www.newportbreakersnetball.com.au', src, d, '5850923a-e02e-4df3-8e62-a9d9d8692e4b')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Shonagh Wheeler', 'verified', 'www.newportbreakersnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'secretary', 'Secretary', 'current', 'verified', 'www.newportbreakersnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'secretarynbnc@gmail.com', 'secretarynbnc@gmail.com', 'role', 'secretary', 'verified', 'www.newportbreakersnetball.com.au', src, d);

  -- ---------------- Pittwater House (school program) ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Pittwater House', 'Northern Beaches', 'www.pittwaterhouse.com.au',
          '~45-90 (school teams, est)', 'Unknown',
          'Private school; netball run via school sport program — no club committee. Association not recorded. Website quality High / functionality Low. Legacy target flag: No.',
          'needs_research', 'www.pittwaterhouse.com.au', src, d, 'c1046b13-c088-4da4-b899-2f55a7098d07')
  returning id into c;
  insert into public.crm_contact_points (club_id, kind, value, value_norm, inbox_type, label, verification, source_url, source_note, verified_on)
  values (c, 'phone', '+61 2 9981 4400', '0299814400', 'general', 'School reception', 'verified', 'www.pittwaterhouse.com.au', src, d);

  -- ---------------- Pittwater Peninsula ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Pittwater Peninsula Netball Club', 'Northern Beaches', 'www.peninsulanetball.org.au',
          '~436 members (stated on club site)', 'Yes (PNUA pool, ~$45/game)',
          'Site mediocre (JS-only, ''Website Title'' bug). Website quality Medium / functionality Medium. Legacy target flag: Maybe.',
          'ready', 'www.peninsulanetball.org.au', src, d, 'a1b2e921-155e-4089-abb4-9acbab5982df')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Pip Prentice', 'verified', 'www.peninsulanetball.org.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.peninsulanetball.org.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'treasurerppnetballclub@gmail.com', 'treasurerppnetballclub@gmail.com', 'role', 'treasurer', 'verified', 'www.peninsulanetball.org.au', src, d),
         (c, p, 'phone', '0420 904 050', '0420904050', 'role', 'treasurer', 'verified', 'www.peninsulanetball.org.au', src, d);

  -- ---------------- Queenscliff ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Queenscliff Netball Club', 'Northern Beaches', 'www.queenscliffnetball.asn.au',
          '~300-450 (est; ''one of largest in MWNA'')', 'Yes (paid pool, direct payment)',
          'Very stale site (2020 umpiring page, Feb 2025 calendar). Website quality Low / functionality Low. Legacy target flag: Yes.',
          'ready', 'www.queenscliffnetball.asn.au', src, d, '1e639d0e-6bfc-4d28-a31d-6e3a46f5766e')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src || ' — notes call it one of the largest in MWNA');
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Luke Geddes', 'verified', 'www.queenscliffnetball.asn.au', src, d) returning id into p2;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, notes, source_url, source_note, verified_on)
  values (c, p2, 'treasurer', 'Treasurer', 'former', 'verified', 'Marked outdated in the legacy sheet.', 'www.queenscliffnetball.asn.au', src, d)
  returning id into a;
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Brigette Bankes', 'verified', 'www.queenscliffnetball.asn.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.queenscliffnetball.asn.au', src, d)
  returning id into p2;  -- reuse as the new appointment id
  update public.crm_appointments set replaced_by_id = p2 where id = a;
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'qnctreasurer@gmail.com', 'qnctreasurer@gmail.com', 'role', 'treasurer', 'verified', 'www.queenscliffnetball.asn.au', src, d);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Gill Fogarty', 'verified', 'www.queenscliffnetball.asn.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, notes, source_url, source_note, verified_on)
  values (c, p, 'umpire_coordinator', 'Umpires', 'current', 'unverified', 'Listed as the umpires contact; the club''s umpiring page dates from 2020.', 'www.queenscliffnetball.asn.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, p, 'phone', '0412 804 311', '0412804311', 'role', 'umpire_coordinator', 'verified', 'www.queenscliffnetball.asn.au', src, d);

  -- ---------------- Seaforth (current client) ----------------
  insert into public.crm_clubs (name, suburb, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Seaforth Netball Club', 'Seaforth', 'Northern Beaches', 'www.seaforthnetball.com.au',
          '~400', 'Yes (confirmed, by badge level)',
          'Existing SidelinePro client (invoiced as SNC). Modern Next.js site with portals. Treasurer phone not published (club policy).',
          'won', 'www.seaforthnetball.com.au', src, d, '64df662c-5607-43a5-bdd2-ad2f0485e388')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, verification, source_note, verified_on)
  values (c, mwna, 'verified', 'SidelinePro client record (sub-org: Manly Warringah Netball)', date '2026-06-27');
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Sarah Cartwright', 'verified', 'www.seaforthnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.seaforthnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, verification, source_note, verified_on)
  values (c, p, 'email', 'seaforthtreasurer@gmail.com', 'seaforthtreasurer@gmail.com', 'role', 'treasurer', 'verified', 'SidelinePro client record (invoice contact)', date '2026-06-27');
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Tai Ifopo', 'verified', 'www.seaforthnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, purchase_roles, source_url, source_note, verified_on)
  values (c, p, 'president', 'President', 'current', 'verified', '{decision_maker}', 'www.seaforthnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, kind, value, value_norm, inbox_type, role_category, verification, source_url, source_note, verified_on)
  values (c, 'email', 'seaforthsecretary@gmail.com', 'seaforthsecretary@gmail.com', 'role', 'secretary', 'verified', 'www.seaforthnetball.com.au', src, d);

  -- ---------------- Wakehurst ----------------
  insert into public.crm_clubs (name, region, website, approx_players, paid_umpires, notes, stage, source_url, source_note, verified_on, legacy_prospect_id)
  values ('Wakehurst Netball Club', 'Northern Beaches', 'www.wakehurstnetball.com.au',
          '~400 (''close to 400 players and members'')', 'Unknown',
          'Wix site OK but key info buried in PDFs. Website quality Medium / functionality Medium. Legacy target flag: Maybe.',
          'ready', 'www.wakehurstnetball.com.au', src, d, '69d60456-e235-4a60-bb0d-88110c5cdab2')
  returning id into c;
  insert into public.crm_club_associations (club_id, association_id, source_note) values (c, mwna, src);
  insert into public.crm_people (full_name, verification, source_url, source_note, verified_on)
  values ('Chris Mottrom', 'verified', 'www.wakehurstnetball.com.au', src, d) returning id into p;
  insert into public.crm_appointments (club_id, person_id, role_category, original_title, status, verification, source_url, source_note, verified_on)
  values (c, p, 'treasurer', 'Treasurer', 'current', 'verified', 'www.wakehurstnetball.com.au', src, d);
  insert into public.crm_contact_points (club_id, person_id, kind, value, value_norm, inbox_type, role_category, label, verification, source_url, source_note, verified_on)
  values (c, p, 'email', 'treasurer@wakehurstnetball.com.au', 'treasurer@wakehurstnetball.com.au', 'role', 'treasurer', null, 'verified', 'www.wakehurstnetball.com.au', src, d),
         (c, null, 'phone', '0414 922 933', '0414922933', 'role', 'secretary', 'Secretary (name not recorded)', 'verified', 'www.wakehurstnetball.com.au', src, d);

  insert into public.crm_change_log (entity, action, changes, source_note, actor_email)
  values ('crm', 'seed', jsonb_build_object('from', 'public.prospects', 'clubs', 18), src, 'migration');
end $$;
