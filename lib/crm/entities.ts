// Which crm_* tables the generic /api/crm/[entity] routes may touch, and
// which columns a client may set on each. Anything not listed is dropped.

import { normEmail, normPhone } from "./normalise";

type FieldType = "text" | "date" | "int" | "bool" | "text[]" | "json" | "uuid" | "uuid[]" | "timestamptz";

export type EntityDef = {
  table: string;
  fields: Record<string, FieldType>;
  required: string[];
  /** Fill derived columns before insert/update. */
  prepare?: (row: Record<string, unknown>) => Record<string, unknown>;
};

const SOURCED: Record<string, FieldType> = {
  source_url: "text",
  source_note: "text",
  verified_on: "date",
};

export const ENTITIES: Record<string, EntityDef> = {
  associations: {
    table: "crm_associations",
    required: ["name"],
    fields: { name: "text", short_name: "text", sport: "text", state: "text", region: "text", website: "text", notes: "text", ...SOURCED },
  },
  clubs: {
    table: "crm_clubs",
    required: ["name"],
    fields: {
      name: "text", aliases: "text[]", sport: "text", suburb: "text", region: "text", state: "text",
      website: "text", social_links: "json", approx_players: "text", approx_teams: "int",
      current_systems: "text", paid_umpires: "text", stage: "text", owner: "text",
      feature_interest: "text[]", pain_points: "text", demo_on: "date", proposal_status: "text",
      delay_reason: "text", loss_reason: "text", notes: "text", ...SOURCED,
    },
  },
  people: {
    table: "crm_people",
    required: ["full_name"],
    fields: {
      full_name: "text", preferred_name: "text", location: "text", linkedin_url: "text",
      employer: "text", job_title: "text", industry: "text", background_tags: "text[]",
      professional_source: "text", professional_verified_on: "date", champion_status: "text",
      preferred_channel: "text", do_not_contact: "bool", unsubscribed_at: "timestamptz",
      notes: "text", verification: "text", ...SOURCED,
    },
  },
  appointments: {
    table: "crm_appointments",
    required: ["club_id", "role_category"],
    fields: {
      club_id: "uuid", person_id: "uuid", role_category: "text", original_title: "text",
      responsibilities: "text", status: "text", season: "text", started_on: "date", ended_on: "date",
      purchase_roles: "text[]", notes: "text", verification: "text", ...SOURCED,
    },
  },
  contact_points: {
    table: "crm_contact_points",
    required: ["kind", "value"],
    fields: {
      person_id: "uuid", club_id: "uuid", kind: "text", value: "text", inbox_type: "text",
      role_category: "text", label: "text", status: "text", outreach_ok: "bool",
      verification: "text", ...SOURCED,
    },
    prepare: (row) => {
      if (typeof row.value === "string") {
        const kind = row.kind ?? (row.value.includes("@") ? "email" : "phone");
        row.value_norm = kind === "email" ? normEmail(row.value) : normPhone(row.value);
        // A work address from background research is never an outreach
        // address unless someone deliberately says so later.
        if (row.inbox_type === "work" && row.outreach_ok === undefined) row.outreach_ok = false;
      }
      return row;
    },
  },
  activities: {
    table: "crm_activities",
    required: ["club_id", "kind"],
    fields: {
      club_id: "uuid", person_ids: "uuid[]", kind: "text", direction: "text", outcome: "text",
      occurred_at: "timestamptz", subject: "text", body: "text", feature_interest: "text[]", pain_points: "text",
    },
  },
  tasks: {
    table: "crm_tasks",
    required: ["club_id", "title"],
    fields: { club_id: "uuid", person_id: "uuid", title: "text", due_on: "date", owner: "text", status: "text" },
    prepare: (row) => {
      if (row.status === "done") row.completed_at = new Date().toISOString();
      else if (row.status === "open") row.completed_at = null;
      return row;
    },
  },
  audiences: {
    table: "crm_audiences",
    required: ["name"],
    fields: { name: "text", description: "text", filters: "json" },
  },
  suppressions: {
    table: "crm_suppressions",
    required: ["email_norm", "reason"],
    fields: { email_norm: "text", reason: "text", person_id: "uuid", note: "text" },
    prepare: (row) => {
      if (typeof row.email_norm === "string") row.email_norm = normEmail(row.email_norm);
      return row;
    },
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/**
 * Keep only known columns, coerce types, turn "" into null so a cleared
 * field clears. Returns an error string for values that can't be coerced.
 */
export function sanitise(def: EntityDef, body: Record<string, unknown>): { row: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {};
  for (const [k, type] of Object.entries(def.fields)) {
    if (!(k in body)) continue;
    let v = body[k];
    if (typeof v === "string") v = v.trim();
    if (v === "" || v === undefined) v = null;
    if (v === null) {
      row[k] = type === "text[]" || type === "uuid[]" ? [] : type === "json" ? {} : null;
      continue;
    }
    switch (type) {
      case "text":
        if (typeof v !== "string") return { row, error: `${k} must be text` };
        break;
      case "date":
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { row, error: `${k} must be YYYY-MM-DD` };
        break;
      case "timestamptz":
        if (typeof v !== "string" || Number.isNaN(Date.parse(v))) return { row, error: `${k} must be a date/time` };
        break;
      case "int":
        v = Number(v);
        if (!Number.isInteger(v)) return { row, error: `${k} must be a whole number` };
        break;
      case "bool":
        if (typeof v !== "boolean") return { row, error: `${k} must be true/false` };
        break;
      case "uuid":
        if (!isUuid(v)) return { row, error: `${k} must be an id` };
        break;
      case "text[]":
      case "uuid[]":
        if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) return { row, error: `${k} must be a list` };
        if (type === "uuid[]" && !v.every(isUuid)) return { row, error: `${k} must be a list of ids` };
        v = [...new Set((v as string[]).map((x) => x.trim()).filter(Boolean))];
        break;
      case "json":
        if (typeof v !== "object") return { row, error: `${k} must be an object` };
        break;
    }
    row[k] = v;
  }
  return { row: def.prepare ? def.prepare(row) : row };
}
