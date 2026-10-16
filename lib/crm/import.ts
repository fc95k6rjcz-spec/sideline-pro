// Import planner: spreadsheet rows → a reviewable plan.
//
// Nothing here writes. planImport() compares every row with what the CRM
// already holds and produces, per row, the club / association / people /
// appointment / contact-point actions it would take, plus every conflict
// a person must decide before anything is committed. The server
// (lib/crm/apply-import.ts) carries out a plan exactly as approved.
//
// Rules:
//   * Never overwrite silently. A club field that differs from what the
//     CRM holds is a conflict, kept as-is unless someone chooses otherwise.
//     Blank fields are filled.
//   * Never duplicate silently. Clubs are fuzzy-matched (exact → linked;
//     close → a person decides), people by email then by name at the club,
//     contact points by normalised value.
//   * A different person in a role the CRM already has a holder for is a
//     possible committee change — the reviewer picks handover / add / skip.
//   * Placeholder prose ("Not published", "N/A") is never imported as data.

import { ROLES, ROLE_BY_KEY } from "./constants";
import { bestClubMatch, type MatchBand } from "./fuzzy";
import { buildIndexes, isLiveAppointment } from "./derive";
import {
  cleanCell,
  extractEmails,
  extractPhones,
  normEmail,
  normPersonName,
  normPhone,
  normUrl,
  parseDateCell,
} from "./normalise";
import { categoriseRole, categoriseTitle } from "./roles";
import type { Table } from "./tabular";
import type { InboxType, Snapshot } from "./types";

// ---------- mapping ----------

export const CLUB_FIELDS = [
  { key: "club.name", label: "Club name" },
  { key: "club.aliases", label: "Club aliases (; separated)" },
  { key: "club.suburb", label: "Suburb" },
  { key: "club.region", label: "Region" },
  { key: "club.state", label: "State" },
  { key: "club.website", label: "Website" },
  { key: "club.facebook", label: "Facebook" },
  { key: "club.instagram", label: "Instagram" },
  { key: "club.general_email", label: "General club email" },
  { key: "club.general_phone", label: "General club phone" },
  { key: "club.approx_players", label: "Players (approx.)" },
  { key: "club.approx_teams", label: "Teams (approx.)" },
  { key: "club.current_systems", label: "Current systems" },
  { key: "club.paid_umpires", label: "Paid umpires" },
  { key: "club.notes", label: "Club notes" },
  { key: "assoc.name", label: "Association(s) (; separated)" },
] as const;

export const ROW_PERSON_FIELDS = [
  { key: "person.name", label: "Contact name (one contact per row)" },
  { key: "person.role_title", label: "Contact role / title" },
  { key: "person.email", label: "Contact email" },
  { key: "person.phone", label: "Contact phone" },
  { key: "person.linkedin", label: "Contact LinkedIn / profile" },
  { key: "person.notes", label: "Contact notes" },
] as const;

export const SOURCE_FIELDS = [
  { key: "source.url", label: "Source URL" },
  { key: "source.date", label: "Date checked" },
  { key: "source.note", label: "Source note" },
] as const;

const SLOT_PARTS = ["name", "email", "phone"] as const;
type SlotPart = (typeof SLOT_PARTS)[number];

/** Per-role columns for "one row per club" sheets: role:treasurer:email. */
export const SLOT_FIELDS = ROLES.filter((r) => r.key !== "other").flatMap((r) =>
  SLOT_PARTS.map((part) => ({ key: `role:${r.key}:${part}`, label: `${r.label} — ${part}` })),
);

export type Mapping = Record<number, string>; // column index → target key ("" = ignore)

/** Best-guess target for each header. Unrecognised columns map to "". */
export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const used = new Set<string>();
  const take = (i: number, key: string) => {
    // Club-level and slot fields map once; later duplicates are ignored.
    if (used.has(key)) return;
    used.add(key);
    m[i] = key;
  };
  const hs = headers.map((h) => h.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim());
  const hasRowName = hs.some((h) => /^(contact |full |person )?name$|^contact$|^person$/.test(h));

  hs.forEach((h, i) => {
    m[i] = "";
    if (!h) return;
    const part: SlotPart | null = /e-?mail/.test(h) ? "email" : /phone|mobile|\bmob\b|\bph\b/.test(h) ? "phone" : /name/.test(h) ? "name" : null;
    const role = categoriseRole(h.replace(/e-?mail|phone|mobile|name|contact/g, " "));

    if (/source/.test(h) && /url|link|web|site/.test(h)) return take(i, "source.url");
    if (/^source$|source note/.test(h)) return take(i, "source.note");
    if (/verified|checked|date researched|research date|as at|last updated/.test(h)) return take(i, "source.date");
    if (/association|assoc\b/.test(h)) return take(i, "assoc.name");
    if (/^club( name)?$|^club_?name$|^name of club$|^organisation$/.test(h)) return take(i, "club.name");
    if (/alias|also known/.test(h)) return take(i, "club.aliases");
    if (/suburb|locality|town/.test(h)) return take(i, "club.suburb");
    if (/region|district|area/.test(h)) return take(i, "club.region");
    if (/^state$/.test(h)) return take(i, "club.state");
    if (/facebook/.test(h)) return take(i, "club.facebook");
    if (/instagram/.test(h)) return take(i, "club.instagram");
    if (/linkedin|profile/.test(h)) return take(i, "person.linkedin");
    if (/(general|club|info|main)\s*(e-?mail|inbox)/.test(h)) return take(i, "club.general_email");
    if (/(general|club|main)\s*(phone|number)/.test(h)) return take(i, "club.general_phone");
    if (/website|web site|^url$|^site$/.test(h) && !/quality|function/.test(h)) return take(i, "club.website");
    if (/player|member(s|ship) count|participants/.test(h)) return take(i, "club.approx_players");
    if (/teams/.test(h)) return take(i, "club.approx_teams");
    if (/system|platform|software|registration tool/.test(h)) return take(i, "club.current_systems");
    if (/paid umpire/.test(h)) return take(i, "club.paid_umpires");

    // Role-specific columns: "Treasurer", "Treasurer email", "umpire convenor phone".
    if (role !== "other" && ROLE_BY_KEY[role]) {
      return take(i, `role:${role}:${part ?? "name"}`);
    }
    if (/^(role|position|title|committee role|office)$/.test(h)) return take(i, "person.role_title");
    if (part === "name" || /^contact$|^person$/.test(h)) return take(i, "person.name");
    if (part === "email") return take(i, hasRowName ? "person.email" : "club.general_email");
    if (part === "phone") return take(i, hasRowName ? "person.phone" : "club.general_phone");
    if (/^notes?$|comments?|remarks/.test(h)) return take(i, hasRowName ? "person.notes" : "club.notes");
  });
  return m;
}

// ---------- plan types ----------

export type ClubFieldKey =
  | "suburb" | "region" | "state" | "website" | "approx_players" | "approx_teams"
  | "current_systems" | "paid_umpires" | "notes";

export type FieldConflict = {
  field: ClubFieldKey | "facebook" | "instagram";
  existing: string;
  incoming: string;
  decision: "keep" | "replace";
};

export type ClubPlan = {
  name: string;
  action: "create" | "match";
  /** Existing club id, or "new:<row>" for a club created earlier in this file. */
  targetId: string | null;
  band: MatchBand | null;
  score: number;
  matchedName: string | null;
  /** A close-but-not-exact match: someone must choose link or create. */
  needsDecision: boolean;
  fills: Partial<Record<ClubFieldKey | "facebook" | "instagram", string>>;
  conflicts: FieldConflict[];
  aliases: string[];
};

export type AssocPlan = { name: string; action: "create" | "match"; targetId: string | null };

export type ContactPointPlan = {
  kind: "email" | "phone";
  value: string;
  value_norm: string;
  inbox_type: InboxType;
  role_category: string | null;
  /** Attach to the person (personal email) or only the club (role/general inbox). */
  linkPerson: boolean;
  action: "create" | "exists";
};

export type ContactPlan = {
  roleKey: string;
  originalTitle: string | null;
  name: string | null;
  notes: string | null;
  linkedin: string | null;
  person: {
    action: "create" | "match" | "none";
    /** Existing person id, or "new:<row>:<n>" for one created earlier in this file. */
    targetId: string | null;
    matchedName: string | null;
    reason: string;
  };
  /** Same name found at a different club — possibly the same volunteer. */
  possibleSamePerson: { id: string; name: string; clubName: string }[];
  linkToPossible: boolean;
  appointment: {
    action: "create" | "exists" | "none";
    existingId: string | null;
    status: "current" | "unverified";
  };
  /** Live holders of this role at the club who are someone else. */
  roleConflict: { appointmentId: string; personName: string }[];
  conflictDecision: "undecided" | "handover" | "add" | "skip";
  contactPoints: ContactPointPlan[];
};

export type RowPlan = {
  row: number; // 0-based data row index
  skip: boolean;
  issues: string[];
  club: ClubPlan | null;
  associations: AssocPlan[];
  clubContactPoints: ContactPointPlan[];
  contacts: ContactPlan[];
  source: { url: string | null; date: string | null; note: string | null };
};

export type ImportPlan = {
  rows: RowPlan[];
  summary: {
    rows: number;
    skipped: number;
    clubsNew: number;
    clubsMatched: number;
    peopleNew: number;
    peopleMatched: number;
    appointmentsNew: number;
    contactPointsNew: number;
    decisionsNeeded: number;
  };
};

// ---------- helpers ----------

/**
 * Pull person names out of a researched cell. Parentheticals become notes
 * ("Sarah Cartwright (Tai Ifopo is President)" → name "Sarah Cartwright",
 * note "Tai Ifopo is President"); "A / B" lists both; prose like
 * "No treasurer listed" or "Vacant" yields nothing.
 */
export function parseNames(cell: string | null | undefined): { names: string[]; note: string | null; multiple: boolean } {
  const raw = (cell ?? "").trim();
  if (!raw) return { names: [], note: null, multiple: false };
  const notes = [...raw.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter(Boolean);
  const stripped = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const note = notes.length ? notes.join("; ") : null;
  if (!cleanCell(stripped) || /\b(listed|published|vacant|unknown|not found|n\/a|tbc|tba)\b/i.test(stripped)) {
    return { names: [], note: note ?? (raw !== stripped ? raw : stripped), multiple: false };
  }
  const parts = stripped
    .split(/\s*(?:\/|;|&|\band\b|,)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s && /[a-z]/i.test(s) && !s.includes("@") && s.split(" ").length <= 5);
  return { names: parts, note, multiple: parts.length > 1 };
}

const ROLE_HINTS: [RegExp, string][] = [
  [/treasur/, "treasurer"],
  [/secretar/, "secretary"],
  [/president|chair/, "president"],
  [/registr|rego/, "registrar"],
  [/umpir/, "umpire_coordinator"],
  [/coach/, "coaching_coordinator"],
];

/** What an address's local part says about who it belongs to. */
export function classifyEmail(
  email: string,
  rawCell: string,
): { inbox: InboxType; role: string | null } {
  const local = email.split("@")[0].toLowerCase();
  for (const [re, role] of ROLE_HINTS) if (re.test(local)) return { inbox: "role", role };
  if (/^(info|contact|admin|enquir|hello|office|mail|general)/.test(local)) return { inbox: "general", role: null };
  if (/club inbox|\(club\)|club email|general/i.test(rawCell)) return { inbox: "general", role: null };
  return { inbox: "personal", role: null };
}

// Role words written next to a phone number in a researched cell:
// "Not published (Pres: 0413 275 007)" sits in the treasurer column but is
// the president's number.
const PHONE_HINTS: [RegExp, string][] = [
  [/\btreas|treasur/, "treasurer"],
  [/\bsec\b|secretar/, "secretary"],
  [/\bpres\b|president|chair/, "president"],
  [/\breg\b|registr|rego/, "registrar"],
  [/umpir/, "umpire_coordinator"],
  [/coach/, "coaching_coordinator"],
];

export function phoneRoleHint(rawCell: string): string | null {
  const text = rawCell.toLowerCase().replace(/[\d+()\s-]{6,}/g, " ");
  for (const [re, role] of PHONE_HINTS) if (re.test(text)) return role;
  return null;
}

type ExistingCp = { id: string; person_id: string | null; club_id: string | null };

// ---------- planner ----------

/** Reviewer choices that change the shape of the plan, keyed by row index. */
export type PlanOverrides = {
  /** "link" = treat the suggested club as the same club; "create" = new club. */
  club?: Record<number, "link" | "create">;
};

export function planImport(
  table: Table,
  mapping: Mapping,
  snapshot: Snapshot,
  overrides: PlanOverrides = {},
): ImportPlan {
  const ix = buildIndexes(snapshot);
  const colsFor = (key: string) =>
    Object.entries(mapping).filter(([, k]) => k === key).map(([i]) => Number(i));
  const cell = (row: string[], key: string): string | null => {
    const vals = colsFor(key).map((i) => (row[i] ?? "").trim()).filter(Boolean);
    return vals.length ? vals.join(" ") : null;
  };

  // Existing lookups.
  const cpByNorm = new Map<string, ExistingCp[]>();
  for (const cp of snapshot.contactPoints) {
    const k = `${cp.kind}:${cp.value_norm}`;
    const arr = cpByNorm.get(k) ?? [];
    arr.push(cp);
    cpByNorm.set(k, arr);
  }
  const assocByName = new Map(snapshot.associations.map((a) => [a.name.trim().toLowerCase(), a]));
  const assocByShort = new Map(
    snapshot.associations.filter((a) => a.short_name).map((a) => [a.short_name!.trim().toLowerCase(), a]),
  );

  // Things created earlier in this same file, so row 7 can match row 2.
  const pendingClubs: { id: string; name: string; aliases: string[] }[] = [];
  const pendingAssocs = new Map<string, string>(); // lower name → "new-assoc:<name>"
  const pendingPeopleByEmail = new Map<string, string>();
  const pendingPeopleByClubName = new Map<string, string>(); // `${clubId}|${normName}` → id
  const pendingCps = new Set<string>(); // see cpState
  const pendingAppts = new Set<string>(); // `${clubId}|${personId}|${role}`

  const rows: RowPlan[] = [];
  table.rows.forEach((row, r) => {
    const issues: string[] = [];
    const sourceUrl = cleanCell(cell(row, "source.url"));
    const sourceDate = parseDateCell(cell(row, "source.date"));
    if (cell(row, "source.date") && !sourceDate) issues.push(`Could not read the date "${cell(row, "source.date")}" — use YYYY-MM-DD or DD/MM/YYYY.`);
    const plan: RowPlan = {
      row: r,
      skip: false,
      issues,
      club: null,
      associations: [],
      clubContactPoints: [],
      contacts: [],
      source: { url: sourceUrl, date: sourceDate, note: cleanCell(cell(row, "source.note")) },
    };
    rows.push(plan);

    const clubName = cleanCell(cell(row, "club.name"));
    if (!clubName) {
      plan.skip = true;
      issues.push("No club name — row skipped.");
      return;
    }

    // ----- club -----
    const incoming: Partial<Record<ClubFieldKey | "facebook" | "instagram", string>> = {};
    const setIf = (k: ClubFieldKey | "facebook" | "instagram", v: string | null) => {
      if (v) incoming[k] = v;
    };
    setIf("suburb", cleanCell(cell(row, "club.suburb")));
    setIf("region", cleanCell(cell(row, "club.region")));
    setIf("state", cleanCell(cell(row, "club.state")));
    const site = cleanCell(cell(row, "club.website"));
    if (site && /facebook\.com/i.test(site)) setIf("facebook", site);
    else setIf("website", site);
    setIf("facebook", cleanCell(cell(row, "club.facebook")));
    setIf("instagram", cleanCell(cell(row, "club.instagram")));
    setIf("approx_players", cleanCell(cell(row, "club.approx_players")));
    const teams = cleanCell(cell(row, "club.approx_teams"));
    if (teams && /^\d+$/.test(teams)) incoming.approx_teams = teams;
    else if (teams) issues.push(`Teams "${teams}" is not a whole number — left out.`);
    setIf("current_systems", cleanCell(cell(row, "club.current_systems")));
    setIf("paid_umpires", cleanCell(cell(row, "club.paid_umpires")));
    setIf("notes", cleanCell(cell(row, "club.notes")));
    const aliases = (cleanCell(cell(row, "club.aliases")) ?? "")
      .split(/;/).map((s) => s.trim()).filter(Boolean);

    const candidates = [
      ...snapshot.clubs.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases })),
      ...pendingClubs,
    ];
    const found = bestClubMatch(clubName, candidates);
    const choice = overrides.club?.[r];
    const base = {
      name: clubName,
      band: found?.band ?? null,
      score: found?.score ?? 0,
      matchedName: found?.match.name ?? null,
      fills: {},
      conflicts: [],
      aliases,
    };
    let club: ClubPlan;
    if (found && (choice === "link" || (!choice && (found.band === "exact" || found.band === "high")))) {
      // Exact → linked outright. High → linked, but shown for a second look
      // until someone confirms it.
      club = { ...base, action: "match", targetId: found.match.id, needsDecision: !choice && found.band === "high" };
    } else {
      // No match, a "maybe" (defaults to a new club but must be looked at),
      // or the reviewer chose "create" over a suggested match.
      club = { ...base, action: "create", targetId: null, needsDecision: !!found && !choice && found.band === "maybe" };
    }

    if (club.action === "match" && club.targetId && !club.targetId.startsWith("new:")) {
      const existing = ix.clubById.get(club.targetId)!;
      for (const [k, v] of Object.entries(incoming) as [keyof typeof incoming, string][]) {
        const cur =
          k === "facebook" || k === "instagram"
            ? existing.social_links?.[k] ?? null
            : existing[k as ClubFieldKey] === null || existing[k as ClubFieldKey] === undefined
              ? null
              : String(existing[k as ClubFieldKey]);
        if (!cur) club.fills[k] = v;
        else {
          const same =
            k === "website" || k === "facebook" || k === "instagram"
              ? normUrl(cur) === normUrl(v)
              : cur.trim().toLowerCase() === v.trim().toLowerCase();
          if (!same) club.conflicts.push({ field: k, existing: cur, incoming: v, decision: "keep" });
        }
      }
    }
    if (club.action === "create") {
      const id = `new:${r}`;
      pendingClubs.push({ id, name: clubName, aliases });
      club.fills = incoming;
    }
    plan.club = club;
    const clubKey = club.action === "match" ? club.targetId! : `new:${r}`;
    const clubIsExisting = !clubKey.startsWith("new:");

    // ----- associations -----
    for (const name of (cleanCell(cell(row, "assoc.name")) ?? "").split(/;/).map((s) => s.trim()).filter(Boolean)) {
      const lower = name.toLowerCase();
      const hit = assocByName.get(lower) ?? assocByShort.get(lower);
      if (hit) plan.associations.push({ name: hit.name, action: "match", targetId: hit.id });
      else {
        if (!pendingAssocs.has(lower)) pendingAssocs.set(lower, `new-assoc:${lower}`);
        plan.associations.push({ name, action: "create", targetId: pendingAssocs.get(lower)! });
      }
    }

    // ----- contact points: helper -----
    // Role and general inboxes belong to the club (one treasurer@ per club,
    // whoever holds the role); personal addresses belong to the person.
    const cpState = (kind: "email" | "phone", norm: string, personId: string | null, inbox: InboxType) => {
      const clubScoped = inbox === "role" || inbox === "general";
      const ex = (cpByNorm.get(`${kind}:${norm}`) ?? []).find((cp) =>
        clubScoped ? clubIsExisting && cp.club_id === clubKey : !!personId && cp.person_id === personId,
      );
      const key = clubScoped ? `${kind}:${norm}|club:${clubKey}` : `${kind}:${norm}|person:${personId ?? ""}`;
      if (ex || pendingCps.has(key)) return "exists" as const;
      pendingCps.add(key);
      return "create" as const;
    };

    // General club inbox / phone.
    const genEmailRaw = cell(row, "club.general_email") ?? "";
    for (const e of extractEmails(genEmailRaw)) {
      plan.clubContactPoints.push({
        kind: "email", value: e, value_norm: normEmail(e), inbox_type: "general", role_category: null,
        linkPerson: false, action: cpState("email", normEmail(e), null, "general"),
      });
    }
    for (const p of extractPhones(cell(row, "club.general_phone"))) {
      plan.clubContactPoints.push({
        kind: "phone", value: p, value_norm: normPhone(p), inbox_type: "general", role_category: null,
        linkPerson: false, action: cpState("phone", normPhone(p), null, "general"),
      });
    }

    // ----- contacts -----
    type RawContact = { roleKey: string; title: string | null; nameCell: string | null; emailCell: string; phoneCell: string; linkedin: string | null; notes: string | null };
    const raws: RawContact[] = [];
    for (const role of ROLES) {
      const n = cell(row, `role:${role.key}:name`);
      const e = cell(row, `role:${role.key}:email`);
      const p = cell(row, `role:${role.key}:phone`);
      if (n || e || p) raws.push({ roleKey: role.key, title: role.label, nameCell: n, emailCell: e ?? "", phoneCell: p ?? "", linkedin: null, notes: null });
    }
    const rowName = cell(row, "person.name");
    const rowTitle = cleanCell(cell(row, "person.role_title"));
    const rowEmail = cell(row, "person.email");
    const rowPhone = cell(row, "person.phone");
    if (rowName || rowEmail || rowPhone) {
      const cats = rowTitle ? categoriseTitle(rowTitle) : ["other"];
      // "Secretary / Treasurer" is one person holding two roles.
      cats.forEach((cat, k) =>
        raws.push({
          roleKey: cat,
          title: rowTitle,
          nameCell: rowName,
          // Contact details belong to the person once, not once per role.
          emailCell: k === 0 ? rowEmail ?? "" : "",
          phoneCell: k === 0 ? rowPhone ?? "" : "",
          linkedin: k === 0 ? cleanCell(cell(row, "person.linkedin")) : null,
          notes: k === 0 ? cleanCell(cell(row, "person.notes")) : null,
        }),
      );
    }

    // People created for this row, so a person holding two roles is one person.
    const rowPeople = new Map<string, string>();

    raws.forEach((rc, n) => {
      const parsed = parseNames(rc.nameCell);
      const emails = extractEmails(`${rc.emailCell} ${rc.nameCell ?? ""}`);
      const phones = extractPhones(`${rc.phoneCell}`);
      const names = parsed.names.length ? parsed.names : [null];

      names.forEach((name, j) => {
        const contact: ContactPlan = {
          roleKey: rc.roleKey,
          originalTitle: rc.title,
          name,
          notes: [parsed.note, rc.notes].filter(Boolean).join("; ") || null,
          linkedin: rc.linkedin,
          person: { action: "none", targetId: null, matchedName: null, reason: "" },
          possibleSamePerson: [],
          linkToPossible: false,
          appointment: { action: "none", existingId: null, status: parsed.multiple ? "unverified" : "current" },
          roleConflict: [],
          conflictDecision: "undecided",
          contactPoints: [],
        };

        // ----- who is this person? -----
        const nn = normPersonName(name);
        let personId: string | null = null;
        const personalEmails = emails.filter((e) => classifyEmail(e, rc.emailCell).inbox === "personal");
        // 1. A personal email already on file is the strongest signal.
        for (const e of personalEmails) {
          const ex = (cpByNorm.get(`email:${normEmail(e)}`) ?? []).find((cp) => cp.person_id);
          if (ex?.person_id) {
            personId = ex.person_id;
            contact.person = { action: "match", targetId: personId, matchedName: ix.personById.get(personId)?.full_name ?? null, reason: `Email ${e} is already on file` };
            break;
          }
          const pending = pendingPeopleByEmail.get(normEmail(e));
          if (pending) {
            personId = pending;
            contact.person = { action: "match", targetId: pending, matchedName: name, reason: "Same email earlier in this file" };
            break;
          }
        }
        // 2. Same name already linked to this club (any role, any time).
        if (!personId && nn) {
          const local = rowPeople.get(nn) ?? pendingPeopleByClubName.get(`${clubKey}|${nn}`);
          if (local) {
            personId = local;
            contact.person = { action: "match", targetId: local, matchedName: name, reason: "Same name earlier in this file" };
          } else if (clubIsExisting) {
            const atClub = (ix.apptsByClub.get(clubKey) ?? [])
              .map((a) => (a.person_id ? ix.personById.get(a.person_id) : undefined))
              .find((p) => p && normPersonName(p.full_name) === nn);
            if (atClub) {
              personId = atClub.id;
              contact.person = { action: "match", targetId: atClub.id, matchedName: atClub.full_name, reason: "Same name already recorded at this club" };
            }
          }
        }
        // 3. New person — but flag namesakes at other clubs.
        if (!personId && name) {
          personId = `new:${r}:${n}:${j}`;
          contact.person = { action: "create", targetId: personId, matchedName: null, reason: "Not found in the CRM" };
          for (const p of snapshot.people) {
            if (normPersonName(p.full_name) !== nn) continue;
            const clubIds = (ix.apptsByPerson.get(p.id) ?? []).map((a) => a.club_id);
            const clubName2 = clubIds.map((id) => ix.clubById.get(id)?.name).filter(Boolean).join(", ") || "no club";
            contact.possibleSamePerson.push({ id: p.id, name: p.full_name, clubName: clubName2 });
          }
          for (const e of personalEmails) pendingPeopleByEmail.set(normEmail(e), personId);
          pendingPeopleByClubName.set(`${clubKey}|${nn}`, personId);
        }
        if (nn && personId) rowPeople.set(nn, personId);

        // ----- appointment -----
        if (personId) {
          const existingLive = clubIsExisting
            ? (ix.apptsByClub.get(clubKey) ?? []).filter((a) => a.role_category === rc.roleKey && isLiveAppointment(a))
            : [];
          const mine = existingLive.find((a) => a.person_id === personId);
          const apptKey = `${clubKey}|${personId}|${rc.roleKey}`;
          if (mine) contact.appointment = { ...contact.appointment, action: "exists", existingId: mine.id };
          else if (pendingAppts.has(apptKey)) contact.appointment = { ...contact.appointment, action: "exists" };
          else {
            pendingAppts.add(apptKey);
            contact.appointment = { ...contact.appointment, action: "create" };
            // Someone else holds this role — possible committee change. Only
            // for single-holder roles; "committee member" and "other" can
            // have many people.
            if (!["committee_member", "other", "team_coordinator"].includes(rc.roleKey)) {
              contact.roleConflict = existingLive
                .filter((a) => a.person_id && a.person_id !== personId)
                .map((a) => ({ appointmentId: a.id, personName: ix.personById.get(a.person_id!)?.full_name ?? "Unknown" }));
            }
          }
        }

        // ----- contact points (attach to the first name only) -----
        if (j === 0) {
          for (const e of emails) {
            const cls = classifyEmail(e, rc.emailCell);
            // treasurer@ in the treasurer column: role inbox, current holder.
            // secretary@ in the treasurer column: the secretary's inbox, not
            // this person's.
            const role = cls.inbox === "role" ? cls.role : null;
            const roleMatches = role === null || role === rc.roleKey;
            const linkPerson = !!personId && roleMatches && cls.inbox !== "general";
            const pid = linkPerson ? personId : null;
            contact.contactPoints.push({
              kind: "email", value: e, value_norm: normEmail(e),
              inbox_type: cls.inbox,
              role_category: cls.inbox === "role" ? role ?? rc.roleKey : null,
              linkPerson,
              action: cpState("email", normEmail(e), pid, cls.inbox),
            });
          }
          const hint = phoneRoleHint(rc.phoneCell);
          for (const p of phones) {
            // A number labelled for a different role belongs to that role,
            // not to this person.
            const role = hint && hint !== rc.roleKey ? hint : rc.roleKey === "other" ? null : rc.roleKey;
            const linkPerson = !!personId && (!hint || hint === rc.roleKey);
            const pid = linkPerson ? personId : null;
            contact.contactPoints.push({
              kind: "phone", value: p, value_norm: normPhone(p),
              inbox_type: role ? "role" : "personal",
              role_category: role,
              linkPerson,
              action: cpState("phone", normPhone(p), pid, role ? "role" : "personal"),
            });
          }
          // A role inbox with no named holder ("Treasurer: treasurer@club").
          if (!personId && !emails.length && !phones.length) return;
        }
        if (!personId && !contact.contactPoints.length) return;
        plan.contacts.push(contact);
      });
    });
  });

  // ----- summary -----
  const live = rows.filter((r) => !r.skip);
  const contacts = live.flatMap((r) => r.contacts);
  const summary = {
    rows: rows.length,
    skipped: rows.length - live.length,
    clubsNew: live.filter((r) => r.club?.action === "create").length,
    clubsMatched: live.filter((r) => r.club?.action === "match").length,
    peopleNew: contacts.filter((c) => c.person.action === "create").length,
    peopleMatched: contacts.filter((c) => c.person.action === "match").length,
    appointmentsNew: contacts.filter((c) => c.appointment.action === "create").length,
    contactPointsNew:
      live.flatMap((r) => r.clubContactPoints).filter((c) => c.action === "create").length +
      contacts.flatMap((c) => c.contactPoints).filter((c) => c.action === "create").length,
    decisionsNeeded: countDecisions(rows),
  };
  return { rows, summary };
}

/** Open decisions: close club matches and role conflicts nobody has resolved. */
export function countDecisions(rows: RowPlan[]): number {
  let n = 0;
  for (const r of rows) {
    if (r.skip) continue;
    if (r.club?.needsDecision) n++;
    for (const c of r.contacts) if (c.roleConflict.length && c.conflictDecision === "undecided") n++;
  }
  return n;
}
