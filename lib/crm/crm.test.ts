import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { categoriseRole, categoriseTitle, roleMatchesQuery } from "@/lib/crm/roles";
import { cleanCell, extractEmails, extractPhones, normPhone, parseDateCell } from "@/lib/crm/normalise";
import { bestClubMatch, nameSimilarity } from "@/lib/crm/fuzzy";
import { parseDelimited, readXlsx, toCsv, toTable } from "@/lib/crm/tabular";
import { agmSeasonStart, buildIndexes, clubView, isStale } from "@/lib/crm/derive";
import { autoMap, classifyEmail, countDecisions, parseNames, phoneRoleHint, planImport } from "@/lib/crm/import";
import { buildAudience, recipientRows } from "@/lib/crm/audience";
import type { Appointment, Club, ContactPoint, Person, Snapshot } from "@/lib/crm/types";

// ---------- fixture ----------

const TODAY = "2026-10-16";
const src = { source_url: null, source_note: null, verified_on: "2026-10-05" };

const club = (id: string, name: string, o: Partial<Club> = {}): Club => ({
  ...src, id, name, aliases: [], sport: "netball", suburb: null, region: "Northern Beaches", state: "NSW",
  website: null, social_links: {}, approx_players: null, approx_teams: null, current_systems: null,
  paid_umpires: null, stage: "ready", owner: null, feature_interest: [], pain_points: null, demo_on: null,
  proposal_status: null, delay_reason: null, loss_reason: null, notes: null, legacy_prospect_id: null,
  created_at: "", updated_at: "", ...o,
});
const person = (id: string, full_name: string, o: Partial<Person> = {}): Person => ({
  ...src, id, full_name, preferred_name: null, location: null, linkedin_url: null, employer: null,
  job_title: null, industry: null, background_tags: [], professional_source: null,
  professional_verified_on: null, champion_status: "none", preferred_channel: null, do_not_contact: false,
  unsubscribed_at: null, notes: null, verification: "verified", created_at: "", updated_at: "", ...o,
});
const appt = (id: string, club_id: string, person_id: string | null, role_category: string, o: Partial<Appointment> = {}): Appointment => ({
  ...src, id, club_id, person_id, role_category, original_title: null, responsibilities: null,
  status: "current", season: null, started_on: null, ended_on: null, purchase_roles: [], replaced_by_id: null,
  notes: null, verification: "verified", created_at: "", updated_at: "", ...o,
});
const cp = (id: string, o: Partial<ContactPoint> & Pick<ContactPoint, "value">): ContactPoint => ({
  ...src, id, person_id: null, club_id: null, kind: "email", value_norm: o.value.toLowerCase(),
  inbox_type: "personal", role_category: null, label: null, status: "active", outreach_ok: true,
  verification: "verified", created_at: "", updated_at: "", ...o,
});

function fixture(): Snapshot {
  return {
    associations: [{ ...src, id: "A1", name: "Manly Warringah Netball Association", short_name: "MWNA", sport: "netball", state: "NSW", region: null, website: null, notes: null, created_at: "", updated_at: "" }],
    clubs: [
      club("C1", "Queenscliff Netball Club"),
      club("C2", "Forest Netball Club", { stage: "demo_booked" }),
      club("C3", "Belrose Netball Club", { stage: "needs_research" }),
      club("C4", "Narrabeen Youth Club"),
    ],
    clubAssociations: [
      { ...src, club_id: "C1", association_id: "A1", verification: "verified" },
      { ...src, club_id: "C2", association_id: "A1", verification: "verified" },
      { ...src, club_id: "C3", association_id: "A1", verification: "unverified" },
    ],
    people: [
      person("P1", "Brigette Bankes"),
      person("P2", "Luke Geddes"),
      person("P3", "Yvonne West", { background_tags: ["technology"], professional_verified_on: "2026-09-01" }),
      person("P4", "Janae Goodall"),
      person("P5", "Gill Fogarty", { unsubscribed_at: "2026-09-01T00:00:00Z" }),
      person("P6", "Sam Lee", { background_tags: ["technology"] }), // suggested only — not confirmed
    ],
    appointments: [
      appt("AP1", "C1", "P1", "treasurer", { original_title: "Treasurer" }),
      appt("AP2", "C1", "P2", "treasurer", { status: "former" }),
      appt("AP3", "C2", "P3", "treasurer"),
      appt("AP4", "C2", "P3", "registrar"),
      appt("AP5", "C3", "P4", "treasurer"),
      appt("AP6", "C1", "P5", "umpire_coordinator", { original_title: "Umpire Convenor" }),
      appt("AP7", "C4", "P6", "secretary"),
    ],
    contactPoints: [
      cp("E1", { value: "qnctreasurer@gmail.com", club_id: "C1", person_id: "P1", inbox_type: "role", role_category: "treasurer" }),
      cp("E2", { value: "brigette@home.com", person_id: "P1" }),
      cp("E3", { value: "yvonne@example.com", person_id: "P3" }),
      cp("E4", { value: "yvonne@bigbank.com.au", person_id: "P3", inbox_type: "work", outreach_ok: false }),
      cp("E5", { value: "belrosenetball@hotmail.com", club_id: "C3", inbox_type: "general" }),
      cp("E6", { value: "gill@example.com", person_id: "P5" }),
      cp("E7", { value: "treasurer@nyc.org.au", club_id: "C4", inbox_type: "role", role_category: "treasurer" }),
      cp("E8", { value: "sam@example.com", person_id: "P6" }),
    ],
    tasks: [{ id: "T1", club_id: "C1", person_id: null, title: "Call", due_on: "2026-10-10", owner: "Rowan", status: "open", completed_at: null, created_by_email: null, created_at: "" }],
    activities: [
      { id: "X1", club_id: "C1", person_ids: ["P1"], kind: "email", direction: "outbound", outcome: "no_response", occurred_at: "2026-10-01T00:00:00Z" },
    ],
    suppressions: [{ email_norm: "treasurer@nyc.org.au", reason: "bounced" }],
    audiences: [],
  };
}

// ---------- roles ----------

describe("roles", () => {
  it("normalises umpire title variants to one category", () => {
    for (const t of ["Umpire Convenor", "Umpire Coordinator", "Head Umpire", "Umpires", "Umpiring Director"]) {
      expect(categoriseRole(t)).toBe("umpire_coordinator");
    }
  });
  it("does not read Vice President as President", () => {
    expect(categoriseTitle("Vice President")).toEqual(["vice_president"]);
  });
  it("splits combined titles into each role", () => {
    expect(categoriseTitle("Secretary / Treasurer")).toEqual(["treasurer", "secretary"]);
  });
  it("matches IT as a word only", () => {
    expect(categoriseRole("IT & Website")).toBe("technology");
    expect(categoriseRole("Fitness coordinator")).not.toBe("technology");
  });
  it("finds a convenor when searching for a coordinator", () => {
    expect(roleMatchesQuery("umpire coordinator", { role_category: "umpire_coordinator", original_title: "Umpire Convenor" })).toBe(true);
    expect(roleMatchesQuery("umpire coordinator", { role_category: "treasurer", original_title: "Treasurer" })).toBe(false);
  });
});

// ---------- normalise ----------

describe("normalise", () => {
  it("treats research prose as blank", () => {
    for (const v of ["Not published", "N/A (school program)", "Unknown", "—", "Vacant (last: Jen 2023)", "?"]) {
      expect(cleanCell(v)).toBeNull();
    }
    expect(cleanCell("Nathan Smith")).toBe("Nathan Smith");
    expect(cleanCell("Xavier")).toBe("Xavier");
  });
  it("pulls emails and AU phones out of annotated cells", () => {
    expect(extractEmails("belrosenetball@hotmail.com (club inbox)")).toEqual(["belrosenetball@hotmail.com"]);
    expect(extractPhones("Not published (club reg: 0419 501 838)")).toEqual(["0419 501 838"]);
    expect(normPhone("+61 2 9981 4400")).toBe("0299814400");
  });
  it("reads AU day-first dates", () => {
    expect(parseDateCell("3/6/2026")).toBe("2026-06-03");
    expect(parseDateCell("2026-06-03")).toBe("2026-06-03");
    expect(parseDateCell("June")).toBeNull();
  });
});

// ---------- fuzzy ----------

describe("fuzzy club matching", () => {
  const clubs = [{ name: "Queenscliff Netball Club", aliases: ["QNC"] }, { name: "Pittwater Peninsula Netball Club", aliases: [] }];
  it("matches abbreviations of the same club", () => {
    expect(bestClubMatch("Queenscliff Netball", clubs)?.band).toBe("high");
    expect(bestClubMatch("QNC", clubs)?.band).toBe("exact");
    expect(bestClubMatch("Pittwater Peninsula NC", clubs)?.match.name).toBe("Pittwater Peninsula Netball Club");
  });
  it("does not match unrelated clubs", () => {
    expect(bestClubMatch("Belrose Netball Club", clubs)).toBeNull();
    expect(nameSimilarity("Seaforth", "Queenscliff")).toBeLessThan(0.62);
  });
});

// ---------- tabular ----------

describe("tabular", () => {
  it("parses quoted CSV with embedded commas and newlines", () => {
    const t = toTable(parseDelimited('Club,Notes\n"Forest NC","Wix site, modern"\n"Belrose","line1\nline2"\n'));
    expect(t.headers).toEqual(["Club", "Notes"]);
    expect(t.rows[1][1]).toBe("line1\nline2");
  });
  it("detects tab-separated paste from a spreadsheet", () => {
    expect(parseDelimited("Club\tTreasurer\nForest\tYvonne West")).toEqual([["Club", "Treasurer"], ["Forest", "Yvonne West"]]);
  });
  it("guards CSV output against formula injection but keeps phone numbers", () => {
    expect(toCsv([["=HYPERLINK(1)", "+61 2 9981 4400"]])).toBe("'=HYPERLINK(1),+61 2 9981 4400");
  });
  it("reads an .xlsx workbook (deflated parts, shared + inline strings)", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": '<workbook><sheets><sheet name="Clubs" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": "<sst><si><t>Club</t></si><si><t>Players</t></si><si><r><t>Forest </t></r><r><t>NC &amp; Co</t></r></si></sst>",
      "xl/worksheets/sheet1.xml":
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2" t="inlineStr"><is><t>extra</t></is></c><c r="B2"><v>300</v></c></row></sheetData></worksheet>',
    };
    const sheets = await readXlsx(zip(files));
    expect(sheets[0].name).toBe("Clubs");
    expect(sheets[0].grid).toEqual([["Club", "Players"], ["Forest NC & Co", "300", "extra"]]);
  });
});

/** Minimal deflate zip writer for the xlsx test. */
function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameB = enc.encode(name);
    const raw = enc.encode(text);
    const data = new Uint8Array(deflateRawSync(raw));
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(8, 8, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, raw.length, true); lh.setUint16(26, nameB.length, true);
    const local = new Uint8Array([...new Uint8Array(lh.buffer), ...nameB, ...data]);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(10, 8, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, raw.length, true); ch.setUint16(28, nameB.length, true);
    ch.setUint32(42, offset, true);
    centrals.push(new Uint8Array([...new Uint8Array(ch.buffer), ...nameB]));
    locals.push(local);
    offset += local.length;
  }
  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, centrals.length, true); end.setUint16(10, centrals.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const part of parts) { out.set(part, p); p += part.length; }
  return out;
}

// ---------- derive ----------

describe("derive", () => {
  it("flags facts checked before this AGM season", () => {
    expect(agmSeasonStart("2026-10-16")).toBe("2026-10-01");
    expect(agmSeasonStart("2027-02-01")).toBe("2026-10-01");
    expect(isStale("2026-06-03", "2026-10-16")).toBe(true);
    expect(isStale("2026-10-05", "2026-10-16")).toBe(false);
    expect(isStale(null, "2026-10-16")).toBe(true);
  });
  it("summarises a club for its card", () => {
    const s = fixture();
    const ix = buildIndexes(s);
    const v = clubView(s.clubs[0], ix, TODAY);
    expect(v.rolesFound.has("treasurer")).toBe(true);
    expect(v.rolesFound.has("umpire_coordinator")).toBe(true);
    expect(v.missingPriority).toContain("president");
    expect(v.contactCount).toBe(2); // Brigette + Gill; Luke is former
    expect(v.awaitingReply).toBe(true);
    expect(v.followUp).toBe("overdue");
    const belrose = clubView(s.clubs[2], ix, TODAY);
    expect(belrose.hasGeneralEmailOnly).toBe(true);
  });
});

// ---------- import ----------

describe("import planning", () => {
  it("auto-maps the legacy prospects sheet columns", () => {
    const m = autoMap(["club_name", "club_website", "approx_players", "paid_umpires", "treasurer_name", "treasurer_email", "treasurer_phone", "notes", "status"]);
    expect(Object.values(m)).toEqual([
      "club.name", "club.website", "club.approx_players", "club.paid_umpires",
      "role:treasurer:name", "role:treasurer:email", "role:treasurer:phone", "club.notes", "",
    ]);
  });
  it("auto-maps a one-contact-per-row sheet", () => {
    const m = autoMap(["Club", "Association", "Name", "Role", "Email", "Mobile", "Source URL", "Date checked"]);
    expect(Object.values(m)).toEqual(["club.name", "assoc.name", "person.name", "person.role_title", "person.email", "person.phone", "source.url", "source.date"]);
  });
  it("reads researched name cells without inventing people", () => {
    expect(parseNames("Sarah Cartwright (Tai Ifopo is President)")).toEqual({ names: ["Sarah Cartwright"], note: "Tai Ifopo is President", multiple: false });
    expect(parseNames("Ana Parker / Dale Hayes (2 listed)").names).toEqual(["Ana Parker", "Dale Hayes"]);
    expect(parseNames("No treasurer listed (Sec: Shonagh Wheeler)").names).toEqual([]);
    expect(parseNames("Vacant (last: Jen Fitzpatrick 2023)").names).toEqual([]);
  });
  it("classifies addresses and labelled phone numbers", () => {
    expect(classifyEmail("nycnetballtreasurer@gmail.com", "")).toEqual({ inbox: "role", role: "treasurer" });
    expect(classifyEmail("belrosenetball@hotmail.com", "belrosenetball@hotmail.com (club inbox)").inbox).toBe("general");
    expect(classifyEmail("jen.f@outlook.com", "").inbox).toBe("personal");
    expect(phoneRoleHint("Not published (Pres: 0413 275 007)")).toBe("president");
    expect(phoneRoleHint("0420 904 050")).toBeNull();
  });

  const headers = ["Club", "Association", "Name", "Role", "Email", "Source URL", "Date checked"];
  const plan = (rows: string[][]) => planImport({ headers, rows }, autoMap(headers), fixture());

  it("links an existing club and person instead of duplicating them", () => {
    const p = plan([["Queenscliff Netball Club", "MWNA", "Brigette Bankes", "Treasurer", "qnctreasurer@gmail.com", "https://qnc.example", "16/10/2026"]]);
    const row = p.rows[0];
    expect(row.club?.action).toBe("match");
    expect(row.club?.targetId).toBe("C1");
    expect(row.associations[0]).toMatchObject({ action: "match", targetId: "A1" });
    const c = row.contacts[0];
    expect(c.person).toMatchObject({ action: "match", targetId: "P1" });
    expect(c.appointment.action).toBe("exists");
    expect(c.contactPoints[0]).toMatchObject({ inbox_type: "role", action: "exists" });
    expect(p.summary.decisionsNeeded).toBe(0);
    expect(row.source).toEqual({ url: "https://qnc.example", date: "2026-10-16", note: null });
  });

  it("raises a committee change when someone new is listed in a filled role", () => {
    const p = plan([["Queenscliff NC", "MWNA", "Jo Smith", "Treasurer", "qnctreasurer@gmail.com", "", ""]]);
    const row = p.rows[0];
    expect(row.club).toMatchObject({ action: "match", band: "high", needsDecision: true });
    const c = row.contacts[0];
    expect(c.person.action).toBe("create");
    expect(c.roleConflict).toEqual([{ appointmentId: "AP1", personName: "Brigette Bankes" }]);
    expect(c.conflictDecision).toBe("undecided");
    expect(p.summary.decisionsNeeded).toBe(2);
    expect(countDecisions(p.rows.map((r) => ({ ...r, club: r.club && { ...r.club, needsDecision: false }, contacts: r.contacts.map((x) => ({ ...x, conflictDecision: "handover" as const })) })))).toBe(0);
  });

  it("de-duplicates clubs and people within one file", () => {
    const p = plan([
      ["Collaroy Plateau Netball Club", "MWNA", "Ana Parker", "Secretary / Treasurer", "ana@example.com", "", ""],
      ["Collaroy Plateau Netball Club", "MWNA", "Ana Parker", "Registrar", "ana@example.com", "", ""],
    ]);
    expect(p.rows[0].club?.action).toBe("create");
    expect(p.rows[1].club).toMatchObject({ action: "match", targetId: "new:0" });
    expect(p.summary.clubsNew).toBe(1);
    // Secretary + Treasurer → one person, two appointments; row 2 reuses her.
    expect(p.rows[0].contacts.map((c) => c.roleKey)).toEqual(["treasurer", "secretary"]);
    expect(p.summary.peopleNew).toBe(1);
    expect(p.rows[1].contacts[0].person.targetId).toBe(p.rows[0].contacts[0].person.targetId);
    expect(p.summary.appointmentsNew).toBe(3);
    expect(p.summary.contactPointsNew).toBe(1);
  });

  it("keeps existing club values when the sheet disagrees", () => {
    const s = fixture();
    s.clubs[1].website = "www.forestnetball.com.au";
    const h = ["Club", "Website", "Suburb"];
    const p = planImport({ headers: h, rows: [["Forest Netball Club", "https://forestnetball.com.au/", "Frenchs Forest"]] }, autoMap(h), s);
    expect(p.rows[0].club?.conflicts).toEqual([]); // same URL, different spelling
    expect(p.rows[0].club?.fills).toEqual({ suburb: "Frenchs Forest" });
    const p2 = planImport({ headers: h, rows: [["Forest Netball Club", "forest.wixsite.com", ""]] }, autoMap(h), s);
    expect(p2.rows[0].club?.conflicts[0]).toMatchObject({ field: "website", decision: "keep" });
  });

  it("asks before linking a merely similar club, and replans when told to link", () => {
    const h = ["Club"];
    const s = fixture();
    const p = planImport({ headers: h, rows: [["Narrabeen Netball"]] }, autoMap(h), s);
    expect(p.rows[0].club).toMatchObject({ action: "create", band: "maybe", needsDecision: true, matchedName: "Narrabeen Youth Club" });
    const linked = planImport({ headers: h, rows: [["Narrabeen Netball"]] }, autoMap(h), s, { club: { 0: "link" } });
    expect(linked.rows[0].club).toMatchObject({ action: "match", targetId: "C4", needsDecision: false });
  });

  it("skips rows with no club and never imports placeholder prose", () => {
    const h = ["club_name", "treasurer_name", "treasurer_email", "treasurer_phone"];
    const p = planImport(
      {
        headers: h,
        rows: [
          ["", "X", "", ""],
          ["Newport Breakers", "No treasurer listed (Sec: Shonagh Wheeler)", "secretarynbnc@gmail.com (secretary)", "Not published (Pres: 0413 275 007)"],
        ],
      },
      autoMap(h),
      fixture(),
    );
    expect(p.rows[0].skip).toBe(true);
    const row = p.rows[1];
    expect(row.contacts).toHaveLength(1);
    const c = row.contacts[0];
    expect(c.person.action).toBe("none");
    expect(c.contactPoints).toEqual([
      expect.objectContaining({ value: "secretarynbnc@gmail.com", inbox_type: "role", role_category: "secretary", linkPerson: false }),
      expect.objectContaining({ value_norm: "0413275007", role_category: "president", linkPerson: false }),
    ]);
  });
});

// ---------- audiences ----------

describe("audiences", () => {
  it("finds treasurers, preferring role inboxes and skipping suppressed addresses", () => {
    const r = buildAudience(fixture(), { roles: ["treasurer"] }, TODAY);
    const emails = r.recipients.map((x) => x.email).sort();
    // Forest: Yvonne's personal (her work address is never used); Queenscliff: role inbox.
    // Belrose: no treasurer address. Narrabeen: inbox bounced.
    expect(emails).toEqual(["qnctreasurer@gmail.com", "yvonne@example.com"]);
    expect(r.clubsMissing.map((m) => m.clubName).sort()).toEqual(["Belrose Netball Club", "Narrabeen Youth Club"]);
    expect(r.peopleWithoutEmail.map((p) => p.name)).toEqual(["Janae Goodall"]);
    expect(r.excluded.map((e) => e.reason)).toEqual(["Suppressed (bounced)"]);
  });
  it("never uses a work address found in background research", () => {
    const s = fixture();
    s.contactPoints.push(cp("E9", { value: "janae@employer.com", person_id: "P4", inbox_type: "work", outreach_ok: false }));
    const r = buildAudience(s, { roles: ["treasurer"], clubIds: ["C3"] }, TODAY);
    expect(r.recipients).toHaveLength(0);
    expect(r.excluded).toEqual([expect.objectContaining({ email: "janae@employer.com", reason: "Work address from background research" })]);
  });
  it("labels a role inbox reached through its holder as a role inbox", () => {
    const s = fixture();
    s.contactPoints = s.contactPoints.filter((c) => c.id !== "E3"); // Yvonne has no personal address…
    s.contactPoints.push(cp("E10", { value: "forestregistrar@gmail.com", club_id: "C2", person_id: "P3", inbox_type: "role", role_category: "registrar" }));
    const r = buildAudience(s, { roles: ["treasurer"], clubIds: ["C2"] }, TODAY);
    expect(r.recipients[0]).toMatchObject({ email: "forestregistrar@gmail.com", via: "role_inbox" });
  });
  it("lists a person with several roles once", () => {
    const r = buildAudience(fixture(), { roles: ["treasurer", "registrar"], clubIds: ["C2"] }, TODAY);
    expect(r.recipients).toHaveLength(1);
    expect(r.recipients[0].roles).toEqual(["Treasurer", "Registrar"]);
  });
  it("uses the general inbox only as a fallback, when asked", () => {
    const without = buildAudience(fixture(), { roles: ["treasurer"], clubIds: ["C3"] }, TODAY);
    expect(without.recipients).toHaveLength(0);
    expect(without.clubsMissing[0].hasGeneral).toBe(true);
    const withFb = buildAudience(fixture(), { roles: ["treasurer"], clubIds: ["C3"], generalFallback: true }, TODAY);
    expect(withFb.recipients[0]).toMatchObject({ email: "belrosenetball@hotmail.com", via: "general_fallback" });
    const onlyGeneral = buildAudience(fixture(), { generalOnly: true, generalFallback: true }, TODAY);
    expect(onlyGeneral.recipients.map((x) => x.email)).toEqual(["belrosenetball@hotmail.com"]);
  });
  it("respects unsubscribes and the not-yet-contacted filter", () => {
    const r = buildAudience(fixture(), { roleQuery: "umpire coordinator" }, TODAY);
    expect(r.recipients).toHaveLength(0);
    expect(r.excluded[0].reason).toBe("Unsubscribed");
    const never = buildAudience(fixture(), { roles: ["treasurer"], contactState: "never" }, TODAY);
    expect(never.recipients.map((x) => x.email)).toEqual(["yvonne@example.com"]); // Queenscliff was emailed
  });
  it("only counts confirmed professional backgrounds", () => {
    const r = buildAudience(fixture(), { backgrounds: ["technology"] }, TODAY);
    expect(r.recipients.map((x) => x.names[0])).toEqual(["Yvonne West"]); // Sam's is unconfirmed
  });
  it("exports one CSV row per recipient", () => {
    const rows = recipientRows(buildAudience(fixture(), { roles: ["treasurer"] }, TODAY).recipients);
    expect(rows.every((r) => r.length === 11)).toBe(true);
  });
});
