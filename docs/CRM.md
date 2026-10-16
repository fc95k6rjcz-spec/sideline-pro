# SidelinePro prospecting CRM

Internal tool for Justin and Rowan to map netball clubs by association, find the right committee members, track every conversation and follow-up, and build mailing lists. Lives at **`/admin/crm`**.

Navigation: **Association → Clubs (board or table) → Club panel (committee, contacts, activity, next step, sources)**.

---

## 1. What was reused

| From | Reused | How |
| --- | --- | --- |
| **SidelinePro** (`sideline-pro`) | Supabase auth + `ADMIN_EMAILS` allowlist, `/admin` shell and nav, brand tokens (gold, ink, Poppins), service-role API pattern, Vercel hosting | The CRM is a module inside `/admin`. No new login, deployment or domain. |
| **SidelinePro** `prospects` table | The 18 researched clubs | Moved into the CRM model by `sql/crm_seed_from_prospects.sql` (hand-parsed, nothing invented). `prospects` is untouched; each club keeps `legacy_prospect_id`, so proposals sent from the Prospects page still show in the club panel. |
| **LEX** (`lease-expiry-app`) | Stack-plan layout | The association board is the stack plan with **stages in place of floors**: a label column on the left and club cards flowing right, coloured by stage. Group-by also offers follow-up date, suburb and A–Z. |
| **LEX** `lib/fuzzy.js` | Fuzzy name matching | Ported to `lib/crm/fuzzy.ts` for import de-duplication, with netball noise words. One change: a single shared word (usually the suburb) is only ever a "maybe", because one suburb can have several clubs. |
| **LEX** `lib/sources.js`, contacts research | Source and confidence discipline | Every fact carries `source_url`, `source_note`, `verified_on` and `verified/unverified/suggested`. |
| **LEX** `lib/xlsx-lite.js` idea | No spreadsheet dependency | `lib/crm/tabular.ts` *reads* .xlsx with the browser's built-in `DecompressionStream`, and parses CSV/TSV and pasted ranges. |

LEX's own code isn't imported: it's plain JS on Next 14 with client-side Supabase and permissive "any signed-in user" RLS. SidelinePro is TypeScript on Next 16 with server-checked access, which is the model the CRM needs.

## 2. Why a module in SidelinePro, not a separate app

* Access control already exists and is strict: only the two allowlisted emails get into `/admin`, checked in middleware, in the layout and in every API route.
* It already holds the clubs, proposals and Seaforth client record, so a prospect can become a client without changing systems.
* One deployment and one database to look after.

Trade-off: the `SidelinePro_Website` Supabase project is **shared with LEX, jfin and other apps**. Every CRM table is therefore prefixed `crm_` and has **RLS on with no policies**, so the anon and authenticated roles can't read it even though LEX users can sign in to the same project. All access goes through `/api/crm/*` with the service role, after the allowlist check. If the CRM ever needs its own users, move it to its own Supabase project; the schema is self-contained.

## 3. Data model (`sql/crm_schema.sql`)

```
crm_associations ──< crm_club_associations >── crm_clubs        a club can be in several associations
crm_clubs ──< crm_appointments >── crm_people                   people hold many roles, at many clubs, over time
crm_contact_points → person and/or club                         personal | role inbox | general | work
crm_clubs ──< crm_activities, crm_tasks                         timeline + follow-ups
crm_change_log                                                  append-only provenance of every write
crm_imports                                                     one row per import batch
crm_profile_matches                                             Phase 2: suggested professional profiles (review queue)
crm_audiences, crm_suppressions, crm_campaigns, crm_campaign_recipients   saved audiences now; Gmail Phase 3
```

Key decisions:

* **Organisations, people and appointments are separate.** A committee change marks the old appointment `former` (with an end date and `replaced_by_id`) and creates a new one. Nothing about the previous holder is deleted.
* **Role inboxes belong to the role.** `treasurer@club` is a contact point on the club with `role_category = treasurer`. It can exist with no named holder. On a committee change it moves to the new holder automatically.
* **The general club inbox is a fallback**, used in audiences only when a club has no address for the targeted role, and only if the audience allows it.
* **Work addresses found in background research** are stored as `inbox_type = work, outreach_ok = false` and never used for outreach.
* **Standard role categories + the club's own title.** `lib/crm/roles.ts` maps "Umpire Convenor", "Head Umpire", "Umpiring Director" and so on to `umpire_coordinator`, so a search for "umpire coordinator" finds them all. "Secretary / Treasurer" becomes two appointments; "Vice President" is never read as "President".
* **Purchase involvement** (decision-maker / feature user / champion / influencer / unknown) is per appointment, multi-select, and labelled as an assessment to confirm in conversation.
* **Professional background**: only *confirmed* details (with a confirmed date) sit on the person and count in filters. Suggestions will live in `crm_profile_matches` until someone confirms them.
* **Stale data**: a fact is due a re-check if it was never checked, was checked over 12 months ago, or was checked before the start of the current AGM season (1 October; `AGM_SEASON_START_MONTH` in `lib/crm/constants.ts`). Today that flags everything researched in June 2026.

## 4. Screens

| Screen | What it does |
| --- | --- |
| **Associations** `/admin/crm` | One tile per association: club count, % of priority roles found, clubs fully mapped, stage mix, research gaps, follow-ups due. Clubs not yet linked to any association get their own tile. |
| **Association board** `/admin/crm/associations/[id]` | Stack-plan board of club cards, or a sortable table. Filters: search, stage, needs research, follow-up due, contacted with no reply, not contacted, to re-check, champion, general-email-only, missing a given priority role, owner. CSV export. |
| **Club panel** (opens from anywhere, deep link `?club=<id>`) | *Summary:* last contact (and whether it's awaiting a reply), next step, open follow-ups, priority-role checklist with SidelinePro's pitch per role, feature interest, pain points, demo/proposal, delay/loss reasons, linked proposals. *Committee:* holders by role with verification and re-check flags, buying roles, contact points, **Committee change**, previous holders, add member (warns if the role is filled). *Activity:* log email/call/meeting/demo/note with the people involved, outcome, interest and an optional follow-up task; full timeline across all committee members. *Club details:* edit everything. *Sources & history:* where each fact came from, plus the change log. |
| **Person panel** (`?person=<id>`) | Every role across clubs, contact points, confirmed professional background, champion status, preferred channel, do-not-contact, unsubscribe (which also suppresses their addresses). |
| **All clubs** `/admin/crm/clubs` | Every club across associations, with an association filter. |
| **People & roles** `/admin/crm/people` | Every appointment. Find every treasurer or umpire convenor, filter by association / stage / contact info / confirmed background / champion / to re-check. Lists clubs with **no** holder of the chosen role. CSV export. |
| **Follow-ups** `/admin/crm/follow-ups` | All open next steps, soonest first, plus clubs that have gone quiet (contacted, no reply, nothing scheduled). |
| **Audiences** `/admin/crm/audiences` | Filter builder with the brief's six example audiences as presets. Shows recipients, clubs reached, clubs missing a contact, people with no email, exclusions and stale addresses **before** export. Saved audiences. De-duplicated CSV. |
| **Import** `/admin/crm/import` | .xlsx / .csv / pasted range → column mapping (auto-guessed) → preview → review → commit. |

## 5. Import rules (`lib/crm/import.ts`, `lib/crm/apply-import.ts`)

* Two layouts: one row per club with per-role columns (`Treasurer name`, `Treasurer email`…) or one row per contact (`Club`, `Name`, `Role`, `Email`…).
* "Not published", "N/A (school)", "Unknown", "Vacant" are blanks, never data. Parentheticals become notes ("Sarah Cartwright (Tai Ifopo is President)" → Sarah, with the note kept). A phone labelled for another role ("Pres: 0413…" in the treasurer column) is filed against that role.
* Clubs: an exact name or alias is linked; a close match must be confirmed; a "maybe" defaults to a new club but must be looked at. The spelling the sheet used is saved as an alias so the next import matches exactly.
* People: matched by an existing personal email, then by name at the same club. Namesakes at other clubs are offered as "same person?" and never merged automatically.
* A different person in a filled role is a **decision**: *took over* (handover) / *both hold it* / *skip*.
* Club fields: blanks are filled; differing values are shown and **kept** unless "use sheet value" is chosen.
* Nothing commits while any decision is open. The server re-checks blanks at write time, logs every write with the import id and source, and reports failed rows without losing the rest.

## 6. Gmail campaigns (Phase 3, designed but not built)

The schema is in place (`crm_campaigns`, `crm_campaign_recipients`, `crm_suppressions`, `crm_activities.gmail_*`). Nothing in the app sends email. The intended flow:

1. Choose a saved audience (already de-duplicated by person and address, with shared-inbox, fallback and suppression rules applied).
2. Choose a role-specific template; merge fields only from **verified** contact and club data.
3. Preview every rendered message and the recipient list; send to `test_recipients` only.
4. Approve. `live_send_enabled` must be switched on per campaign, deliberately.
5. Send through the SidelinePro Google account via the Gmail API (OAuth, `gmail.send` + `gmail.readonly` for reply detection), throttled to `daily_limit`. Google Workspace allows about 2,000 messages a day and a consumer account about 500; start at 50 a day for deliverability.
6. Record each send as an activity against the person and club; poll threads for replies and bounces. Follow-ups stop on reply, unsubscribe, bounce or manual exclusion.
7. Every message carries an unsubscribe link that writes to `crm_suppressions`.

Open/click tracking is optional and unreliable. Apple Mail Privacy Protection and Gmail image proxying fire "opens" that never happened, and corporate link scanners "click". Treat replies as the only dependable signal.

## 7. Phases

* **Phase 1 — core CRM (this build).** All screens above, seeded with the 18 legacy clubs.
* **Phase 2 — research and enrichment.** Research queue (clubs and roles to re-check, ordered by stage and staleness); profile-match review UI on `crm_profile_matches` (candidate, evidence, conflicts, confidence, confirm/reject/unresolved; a matching name alone is never enough); the association directory as a club-discovery source.
* **Phase 3 — campaigns.** Section 6.

## 8. Dependencies and access needed

* **Committee research for the rest of Greater Sydney.** The CRM holds the 18 Northern Beaches clubs from the old Prospects sheet. Other associations need importing (any spreadsheet layout works).
* **Gmail (Phase 3).** Whether the `sidelinepro.com.au` mailbox is Google Workspace or another provider (invoices currently go out through Resend), and a Google Cloud OAuth client approved for the `gmail.send` scope.
* **Professional profile search (Phase 2).** Direct LinkedIn scraping breaches its terms. Use manual research with the review queue, or a compliant provider (e.g. Proxycurl, Apollo, Lusha) with an API key.
* **The legacy Prospects page** keeps working against `prospects`. Retire it once the CRM is in use.

## 9. Tests

`npm test` covers role normalisation, placeholder cleaning, fuzzy matching, CSV/XLSX parsing, staleness, club summaries, import planning (layouts, duplicates, committee changes, conflicts, within-file de-dupe), the import commit against an in-memory database (handover, idempotent re-run, skip) and audience building (de-dupe, fallback, suppression, unsubscribes, confirmed backgrounds).
