// Audience builder: filters → a deduplicated recipient list, plus what is
// missing and what was left out and why. Used for CSV export now and as
// the recipient step of Gmail campaigns later.
//
// Rules:
//   * One row per human: a person reached through several addresses (their
//     own plus a role inbox, or two clubs' treasurer inboxes) appears once,
//     with every club and role they hold listed.
//   * One row per address: two people behind one shared inbox appear once.
//   * Role inbox before personal address for the same person at one club —
//     it reaches whoever holds the role, and is what the club published.
//   * A club's general inbox is a fallback only: used when the club has no
//     address for any targeted role, and only if the filter asks for it.
//   * Never: unsubscribed / do-not-contact people, suppressed or bounced
//     addresses, or work addresses found during background research.

import { roleLabel } from "./constants";
import { buildIndexes, clubView, isLiveAppointment, isStale, type ClubView } from "./derive";
import { todayISO } from "./normalise";
import { roleMatchesQuery } from "./roles";
import type { Appointment, ContactPoint, Person, Snapshot } from "./types";

export type AudienceFilters = {
  associationIds?: string[];
  /** Include clubs not yet linked to any association. */
  includeUnassigned?: boolean;
  regions?: string[];
  suburbs?: string[];
  clubIds?: string[];
  roles?: string[]; // role categories; empty = any
  roleQuery?: string; // free-text, normalised ("umpire coordinator")
  stages?: string[]; // empty = any
  featureInterest?: string[];
  verifiedOnly?: boolean;
  backgrounds?: string[]; // confirmed professional background tags
  champion?: "any" | "potential" | "confirmed";
  contactState?: "any" | "never" | "awaiting_reply" | "replied";
  lastContactBefore?: string;
  lastContactAfter?: string;
  followUpDue?: boolean;
  generalFallback?: boolean;
  /** Clubs whose only address on file is the general inbox. */
  generalOnly?: boolean;
};

export type Recipient = {
  email: string;
  emailNorm: string;
  names: string[];
  personIds: string[];
  clubIds: string[];
  clubNames: string[];
  associationNames: string[];
  roles: string[]; // role labels
  inboxType: ContactPoint["inbox_type"];
  verification: ContactPoint["verification"];
  verifiedOn: string | null;
  stale: boolean;
  via: "role_inbox" | "personal" | "general_fallback";
  sourceUrl: string | null;
};

export type Exclusion = { email: string; name: string | null; clubName: string; reason: string };

export type AudienceResult = {
  clubsInScope: number;
  clubsReached: number;
  recipients: Recipient[];
  /** Clubs in scope with no usable address for the targeted roles. */
  clubsMissing: { clubId: string; clubName: string; missing: string[]; hasGeneral: boolean }[];
  /** People in a targeted role with no usable address. */
  peopleWithoutEmail: { personId: string; name: string; clubName: string; role: string }[];
  excluded: Exclusion[];
  staleCount: number;
};

function personBlocked(p: Person | undefined): string | null {
  if (!p) return null;
  if (p.unsubscribed_at) return "Unsubscribed";
  if (p.do_not_contact) return "Do not contact";
  return null;
}

export function clubMatches(v: ClubView, f: AudienceFilters, today: string): boolean {
  const c = v.club;
  const assocIds = v.associations.map((a) => a.id);
  if (f.associationIds?.length || f.includeUnassigned) {
    const inAssoc = assocIds.some((id) => f.associationIds?.includes(id));
    const unassigned = f.includeUnassigned && assocIds.length === 0;
    if (!inAssoc && !unassigned) return false;
  }
  if (f.regions?.length && !f.regions.includes(c.region ?? "")) return false;
  if (f.suburbs?.length && !f.suburbs.includes(c.suburb ?? "")) return false;
  if (f.clubIds?.length && !f.clubIds.includes(c.id)) return false;
  if (f.stages?.length && !f.stages.includes(c.stage)) return false;
  if (f.featureInterest?.length && !f.featureInterest.some((x) => c.feature_interest.includes(x))) return false;
  if (f.champion === "confirmed" && v.champion !== "confirmed") return false;
  if (f.champion === "potential" && !v.champion) return false;
  if (f.contactState === "never" && v.lastContactAt) return false;
  if (f.contactState === "awaiting_reply" && !v.awaitingReply) return false;
  if (f.contactState === "replied" && !v.lastInboundAt) return false;
  const last = v.lastContactAt?.slice(0, 10) ?? null;
  if (f.lastContactBefore && last && last >= f.lastContactBefore) return false;
  if (f.lastContactAfter && (!last || last < f.lastContactAfter)) return false;
  if (f.followUpDue && !(v.followUp === "overdue" || v.followUp === "today")) return false;
  if (f.generalOnly && !v.hasGeneralEmailOnly) return false;
  void today;
  return true;
}

export function buildAudience(snapshot: Snapshot, f: AudienceFilters, today: string = todayISO()): AudienceResult {
  const ix = buildIndexes(snapshot);
  const views = snapshot.clubs.map((c) => clubView(c, ix, today)).filter((v) => clubMatches(v, f, today));

  const wantsRole = (a: Pick<Appointment, "role_category" | "original_title">) =>
    (!f.roles?.length || f.roles.includes(a.role_category)) &&
    (!f.roleQuery?.trim() || roleMatchesQuery(f.roleQuery, a));
  const wantsRoleKey = (key: string) => wantsRole({ role_category: key, original_title: null });
  const personQualifies = (p: Person | undefined) => {
    if (!f.backgrounds?.length) return true;
    // Only confirmed professional details count — suggestions don't.
    return !!p && !!p.professional_verified_on && f.backgrounds.some((b) => p.background_tags.includes(b));
  };

  type Pick1 = { cp: ContactPoint; personId: string | null; clubId: string; role: string; via: Recipient["via"] };
  const picks: Pick1[] = [];
  const excluded: Exclusion[] = [];
  const peopleWithoutEmail: AudienceResult["peopleWithoutEmail"] = [];
  const clubsMissing: AudienceResult["clubsMissing"] = [];
  const suppressedWhy = (norm: string) =>
    snapshot.suppressions.find((s) => s.email_norm === norm)?.reason ?? null;

  const consider = (cp: ContactPoint, person: Person | undefined, clubName: string): boolean => {
    const name = person?.full_name ?? null;
    if (cp.inbox_type === "work" && !cp.outreach_ok) {
      excluded.push({ email: cp.value, name, clubName, reason: "Work address from background research" });
      return false;
    }
    if (cp.status !== "active") {
      excluded.push({ email: cp.value, name, clubName, reason: cp.status === "bounced" ? "Bounced" : `Address ${cp.status}` });
      return false;
    }
    const sup = suppressedWhy(cp.value_norm);
    if (sup) {
      excluded.push({ email: cp.value, name, clubName, reason: `Suppressed (${sup})` });
      return false;
    }
    const blocked = cp.inbox_type === "personal" ? personBlocked(person) : null;
    if (blocked) {
      excluded.push({ email: cp.value, name, clubName, reason: blocked });
      return false;
    }
    if (f.verifiedOnly && cp.verification !== "verified") return false;
    return true;
  };

  for (const v of views) {
    const club = v.club;
    const appts = (ix.apptsByClub.get(club.id) ?? []).filter(
      (a) => isLiveAppointment(a) && a.person_id && wantsRole(a),
    );
    // "Only a general address" audiences skip role contacts entirely.
    const appts2 = f.generalOnly ? [] : appts;
    const roleInboxes = f.generalOnly
      ? []
      : (ix.cpsByClub.get(club.id) ?? []).filter(
          (cp) => cp.kind === "email" && cp.inbox_type === "role" && !!cp.role_category && wantsRoleKey(cp.role_category),
        );
    let reached = false;
    const coveredInboxes = new Set<string>();

    for (const a of appts2) {
      const person = ix.personById.get(a.person_id!);
      if (!personQualifies(person)) continue;
      if (f.verifiedOnly && a.verification !== "verified") continue;
      if (f.contactState === "never") {
        const touched = (ix.actsByClub.get(club.id) ?? []).some((x) => x.person_ids.includes(a.person_id!));
        if (touched) continue;
      }
      const blocked = personBlocked(person);
      // Role inbox for this role first (it reaches whoever holds the role).
      const inbox = roleInboxes.find((cp) => cp.role_category === a.role_category);
      const personal = (ix.cpsByPerson.get(a.person_id!) ?? []).filter((cp) => cp.kind === "email");
      let chosen: ContactPoint | null = null;
      let via: Recipient["via"] = "role_inbox";
      if (inbox && consider(inbox, undefined, club.name)) {
        chosen = inbox;
        coveredInboxes.add(inbox.id);
      } else if (blocked) {
        excluded.push({ email: personal[0]?.value ?? "—", name: person?.full_name ?? null, clubName: club.name, reason: blocked });
        continue;
      } else {
        // Their own address first; failing that, another role inbox they
        // hold (e.g. the registrar@ of someone who is also treasurer).
        const ranked = [
          ...personal.filter((cp) => cp.inbox_type === "personal" || cp.inbox_type === "work"),
          ...personal.filter((cp) => cp.inbox_type === "role"),
        ];
        const ok = ranked.find((cp) => consider(cp, person, club.name));
        if (ok) {
          chosen = ok;
          via = ok.inbox_type === "role" ? "role_inbox" : "personal";
        }
      }
      if (chosen) {
        picks.push({ cp: chosen, personId: a.person_id, clubId: club.id, role: a.role_category, via });
        reached = true;
      } else {
        peopleWithoutEmail.push({ personId: a.person_id!, name: person?.full_name ?? "—", clubName: club.name, role: roleLabel(a.role_category) });
      }
    }

    // Role inboxes with nobody named against them still reach the role —
    // unless the filter is about people (backgrounds, never-contacted people).
    if (!f.backgrounds?.length) {
      for (const cp of roleInboxes) {
        if (coveredInboxes.has(cp.id)) continue;
        const holderTargeted = appts.some((a) => a.role_category === cp.role_category);
        if (holderTargeted) continue; // already handled (or excluded) via the holder
        if (f.contactState === "never" && v.lastContactAt) continue;
        if (consider(cp, undefined, club.name)) {
          picks.push({ cp, personId: cp.person_id, clubId: club.id, role: cp.role_category!, via: "role_inbox" });
          reached = true;
        }
      }
    }

    if (!reached) {
      const general = v.generalEmails.filter((cp) => consider(cp, undefined, club.name));
      if (f.generalFallback && general.length && !f.backgrounds?.length) {
        picks.push({ cp: general[0], personId: null, clubId: club.id, role: "general", via: "general_fallback" });
        reached = true;
      } else {
        const targeted = f.roles?.length ? f.roles.map(roleLabel) : f.roleQuery ? [f.roleQuery] : ["any committee contact"];
        clubsMissing.push({ clubId: club.id, clubName: club.name, missing: targeted, hasGeneral: general.length > 0 });
      }
    }
  }

  // ---- dedupe: one row per person, then one row per address ----
  const byPerson = new Map<string, Pick1[]>();
  const loose: Pick1[] = [];
  for (const p of picks) {
    if (p.personId) {
      const arr = byPerson.get(p.personId) ?? [];
      arr.push(p);
      byPerson.set(p.personId, arr);
    } else loose.push(p);
  }
  const merged = new Map<string, Recipient>();
  const add = (p: Pick1, extra: Pick1[] = []) => {
    const all = [p, ...extra];
    const key = p.cp.value_norm;
    const r: Recipient =
      merged.get(key) ??
      {
        email: p.cp.value,
        emailNorm: key,
        names: [],
        personIds: [],
        clubIds: [],
        clubNames: [],
        associationNames: [],
        roles: [],
        inboxType: p.cp.inbox_type,
        verification: p.cp.verification,
        verifiedOn: p.cp.verified_on,
        stale: isStale(p.cp.verified_on, today),
        via: p.via,
        sourceUrl: p.cp.source_url,
      };
    for (const x of all) {
      const person = x.personId ? ix.personById.get(x.personId) : undefined;
      if (person && !r.personIds.includes(person.id)) {
        r.personIds.push(person.id);
        r.names.push(person.full_name);
      }
      const club = ix.clubById.get(x.clubId);
      if (club && !r.clubIds.includes(club.id)) {
        r.clubIds.push(club.id);
        r.clubNames.push(club.name);
        for (const aid of ix.assocIdsByClub.get(club.id) ?? []) {
          const an = ix.assocById.get(aid)?.short_name || ix.assocById.get(aid)?.name;
          if (an && !r.associationNames.includes(an)) r.associationNames.push(an);
        }
      }
      const label = x.role === "general" ? "General club inbox" : roleLabel(x.role);
      if (!r.roles.includes(label)) r.roles.push(label);
    }
    merged.set(key, r);
  };
  for (const [, arr] of byPerson) {
    // Prefer the person's own address if they have one in the list (it
    // reaches them for every club); otherwise their first role inbox.
    const primary = arr.find((x) => x.via === "personal") ?? arr[0];
    add(primary, arr.filter((x) => x !== primary));
  }
  for (const p of loose) add(p);

  const recipients = [...merged.values()].sort((a, b) =>
    (a.clubNames[0] ?? "").localeCompare(b.clubNames[0] ?? "") || a.email.localeCompare(b.email),
  );
  const reachedClubs = new Set(recipients.flatMap((r) => r.clubIds));

  // An exclusion that was still reached another way isn't worth showing.
  const reachedNorms = new Set(recipients.map((r) => r.emailNorm));
  const uniqExcluded = new Map<string, Exclusion>();
  for (const e of excluded) {
    const k = `${e.email.toLowerCase()}|${e.reason}`;
    if (!reachedNorms.has(e.email.toLowerCase()) && !uniqExcluded.has(k)) uniqExcluded.set(k, e);
  }

  return {
    clubsInScope: views.length,
    clubsReached: reachedClubs.size,
    recipients,
    clubsMissing,
    peopleWithoutEmail,
    excluded: [...uniqExcluded.values()],
    staleCount: recipients.filter((r) => r.stale).length,
  };
}

export const RECIPIENT_CSV_HEADERS = [
  "Email", "Name(s)", "First name", "Role(s)", "Club(s)", "Association(s)",
  "Address type", "Verification", "Last checked", "Needs re-check", "Source",
];

export function recipientRows(rs: Recipient[]): string[][] {
  return rs.map((r) => [
    r.email,
    r.names.join("; "),
    r.names.length === 1 ? r.names[0].split(" ")[0] : "",
    r.roles.join("; "),
    r.clubNames.join("; "),
    r.associationNames.join("; "),
    r.via === "general_fallback" ? "General club inbox" : r.inboxType === "role" ? "Role inbox" : "Personal",
    r.verification,
    r.verifiedOn ?? "",
    r.stale ? "Yes" : "",
    r.sourceUrl ?? "",
  ]);
}

/** Starting points matching the examples in the brief. */
export const AUDIENCE_PRESETS: { name: string; filters: AudienceFilters }[] = [
  { name: "Treasurers with verified email addresses", filters: { roles: ["treasurer"], verifiedOnly: true } },
  { name: "Umpire convenors not yet contacted", filters: { roles: ["umpire_coordinator"], contactState: "never" } },
  {
    name: "Presidents and secretaries at clubs without a booked demo",
    filters: { roles: ["president", "secretary"], stages: ["needs_research", "ready", "contacted", "engaged", "nurture"] },
  },
  { name: "Coaching coordinators interested in player grading", filters: { roles: ["coaching_coordinator"], featureInterest: ["player_grading"] } },
  { name: "Clubs with a confirmed contact working in technology", filters: { backgrounds: ["technology"] } },
  { name: "Clubs where only a general email is available", filters: { generalOnly: true, generalFallback: true } },
];
