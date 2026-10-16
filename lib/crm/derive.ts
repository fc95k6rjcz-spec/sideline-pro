import { AGM_SEASON_START_MONTH, PRIORITY_ROLES, STALE_AFTER_DAYS } from "./constants";
import { todayISO } from "./normalise";
import type {
  ActivityLite,
  Appointment,
  Association,
  Club,
  ContactPoint,
  Person,
  Snapshot,
  Task,
} from "./types";

const DAY = 86_400_000;

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round(
    (new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / DAY,
  );
}

/** Start of the AGM season committees most recently went through. */
export function agmSeasonStart(today: string = todayISO()): string {
  const [y, m] = today.split("-").map(Number);
  const year = m >= AGM_SEASON_START_MONTH ? y : y - 1;
  return `${year}-${String(AGM_SEASON_START_MONTH).padStart(2, "0")}-01`;
}

/**
 * Is a researched fact due a re-check? Never checked, checked more than a
 * year ago, or checked before the AGM season that has since started
 * (committees change at AGMs, so last season's treasurer may be gone).
 */
export function isStale(verifiedOn: string | null | undefined, today: string = todayISO()): boolean {
  if (!verifiedOn) return true;
  const d = verifiedOn.slice(0, 10);
  if (daysBetween(d, today) > STALE_AFTER_DAYS) return true;
  return d < agmSeasonStart(today);
}

export type FollowUpState = "overdue" | "today" | "soon" | "later" | "none";

export function followUpState(due: string | null | undefined, today: string = todayISO()): FollowUpState {
  if (!due) return "none";
  const diff = daysBetween(today, due.slice(0, 10));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "soon";
  return "later";
}

/** Appointments that describe who holds a role now (current or unconfirmed). */
export function isLiveAppointment(a: Appointment): boolean {
  return a.status === "current" || a.status === "unverified";
}

export type ClubView = {
  club: Club;
  associations: Association[];
  /** Live appointments with a person. */
  current: Appointment[];
  /** Priority role keys that have a live, named holder or a role inbox. */
  rolesFound: Set<string>;
  missingPriority: string[];
  contactCount: number; // distinct people in live roles
  hasGeneralEmailOnly: boolean;
  generalEmails: ContactPoint[];
  champion: "confirmed" | "potential" | null;
  lastContactAt: string | null; // last outbound/inbound/meeting
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  /** Contacted, with no reply logged since the last outbound touch. */
  awaitingReply: boolean;
  nextTask: Task | null;
  followUp: FollowUpState;
  staleCount: number; // live appointments due a re-check
  needsResearch: boolean;
};

export type Indexes = {
  clubById: Map<string, Club>;
  personById: Map<string, Person>;
  assocById: Map<string, Association>;
  assocIdsByClub: Map<string, string[]>;
  clubIdsByAssoc: Map<string, string[]>;
  apptsByClub: Map<string, Appointment[]>;
  apptsByPerson: Map<string, Appointment[]>;
  cpsByClub: Map<string, ContactPoint[]>;
  cpsByPerson: Map<string, ContactPoint[]>;
  tasksByClub: Map<string, Task[]>;
  actsByClub: Map<string, ActivityLite[]>;
  suppressed: Set<string>;
};

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

export function buildIndexes(s: Snapshot): Indexes {
  const ix: Indexes = {
    clubById: new Map(s.clubs.map((c) => [c.id, c])),
    personById: new Map(s.people.map((p) => [p.id, p])),
    assocById: new Map(s.associations.map((a) => [a.id, a])),
    assocIdsByClub: new Map(),
    clubIdsByAssoc: new Map(),
    apptsByClub: new Map(),
    apptsByPerson: new Map(),
    cpsByClub: new Map(),
    cpsByPerson: new Map(),
    tasksByClub: new Map(),
    actsByClub: new Map(),
    suppressed: new Set(s.suppressions.map((x) => x.email_norm)),
  };
  for (const ca of s.clubAssociations) {
    push(ix.assocIdsByClub, ca.club_id, ca.association_id);
    push(ix.clubIdsByAssoc, ca.association_id, ca.club_id);
  }
  for (const a of s.appointments) {
    push(ix.apptsByClub, a.club_id, a);
    if (a.person_id) push(ix.apptsByPerson, a.person_id, a);
  }
  for (const cp of s.contactPoints) {
    if (cp.club_id) push(ix.cpsByClub, cp.club_id, cp);
    if (cp.person_id) push(ix.cpsByPerson, cp.person_id, cp);
  }
  for (const t of s.tasks) if (t.status === "open") push(ix.tasksByClub, t.club_id, t);
  for (const a of s.activities) push(ix.actsByClub, a.club_id, a);
  return ix;
}

/** Contact activity = anything that actually reached or came from the club. */
const isTouch = (a: ActivityLite) => a.kind !== "note" && a.kind !== "stage_change";

export function clubView(club: Club, ix: Indexes, today: string = todayISO()): ClubView {
  const appts = ix.apptsByClub.get(club.id) ?? [];
  const current = appts.filter((a) => isLiveAppointment(a) && a.person_id);
  const cps = ix.cpsByClub.get(club.id) ?? [];

  const rolesFound = new Set<string>();
  for (const a of current) rolesFound.add(a.role_category);
  for (const cp of cps) {
    if (cp.inbox_type === "role" && cp.role_category && cp.status === "active") {
      rolesFound.add(cp.role_category);
    }
  }
  const missingPriority = PRIORITY_ROLES.map((r) => r.key).filter((k) => !rolesFound.has(k));

  const peopleIds = new Set(current.map((a) => a.person_id as string));
  const generalEmails = cps.filter(
    (cp) => cp.kind === "email" && cp.inbox_type === "general" && cp.status === "active",
  );
  const hasRoleOrPersonalEmail = cps.some(
    (cp) => cp.kind === "email" && cp.inbox_type === "role" && cp.status === "active",
  ) ||
    [...peopleIds].some((pid) =>
      (ix.cpsByPerson.get(pid) ?? []).some(
        (cp) => cp.kind === "email" && cp.inbox_type === "personal" && cp.status === "active",
      ),
    );

  let champion: ClubView["champion"] = null;
  for (const pid of peopleIds) {
    const p = ix.personById.get(pid);
    if (p?.champion_status === "confirmed") champion = "confirmed";
    else if (p?.champion_status === "potential" && champion !== "confirmed") champion = "potential";
  }
  if (!champion && current.some((a) => a.purchase_roles.includes("champion"))) champion = "potential";

  const acts = (ix.actsByClub.get(club.id) ?? []).filter(isTouch);
  let lastContactAt: string | null = null;
  let lastInboundAt: string | null = null;
  let lastOutboundAt: string | null = null;
  for (const a of acts) {
    if (!lastContactAt || a.occurred_at > lastContactAt) lastContactAt = a.occurred_at;
    if (a.direction === "inbound" || a.outcome === "replied" || a.outcome === "connected" || a.outcome === "interested" || a.outcome === "not_interested") {
      if (!lastInboundAt || a.occurred_at > lastInboundAt) lastInboundAt = a.occurred_at;
    } else if (a.direction === "outbound") {
      if (!lastOutboundAt || a.occurred_at > lastOutboundAt) lastOutboundAt = a.occurred_at;
    }
  }
  const awaitingReply = !!lastOutboundAt && (!lastInboundAt || lastInboundAt < lastOutboundAt);

  const open = [...(ix.tasksByClub.get(club.id) ?? [])].sort((a, b) =>
    (a.due_on ?? "9999") < (b.due_on ?? "9999") ? -1 : 1,
  );
  const nextTask = open[0] ?? null;

  const staleCount = current.filter((a) => isStale(a.verified_on, today)).length;
  const assocs = (ix.assocIdsByClub.get(club.id) ?? [])
    .map((id) => ix.assocById.get(id))
    .filter((a): a is Association => !!a);

  return {
    club,
    associations: assocs,
    current,
    rolesFound,
    missingPriority,
    contactCount: peopleIds.size,
    hasGeneralEmailOnly: generalEmails.length > 0 && !hasRoleOrPersonalEmail,
    generalEmails,
    champion,
    lastContactAt,
    lastInboundAt,
    lastOutboundAt,
    awaitingReply,
    nextTask,
    followUp: followUpState(nextTask?.due_on, today),
    staleCount,
    needsResearch:
      club.stage === "needs_research" ||
      ["president", "treasurer", "secretary"].some((k) => !rolesFound.has(k)),
  };
}

export type AssociationCoverage = {
  association: Association | null; // null = clubs with no association yet
  clubCount: number;
  /** Clubs with every priority role found. */
  fullyMapped: number;
  /** Share of (club × priority role) slots filled, 0..1. */
  coverage: number;
  needsResearch: number;
  followUpsDue: number;
  byStage: Record<string, number>;
  won: number;
};

export function associationCoverage(
  association: Association | null,
  views: ClubView[],
): AssociationCoverage {
  const slots = views.length * PRIORITY_ROLES.length;
  const filled = views.reduce((n, v) => n + (PRIORITY_ROLES.length - v.missingPriority.length), 0);
  const byStage: Record<string, number> = {};
  for (const v of views) byStage[v.club.stage] = (byStage[v.club.stage] ?? 0) + 1;
  return {
    association,
    clubCount: views.length,
    fullyMapped: views.filter((v) => v.missingPriority.length === 0).length,
    coverage: slots ? filled / slots : 0,
    needsResearch: views.filter((v) => v.needsResearch).length,
    followUpsDue: views.filter((v) => v.followUp === "overdue" || v.followUp === "today").length,
    byStage,
    won: byStage.won ?? 0,
  };
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "2-digit" });
}
