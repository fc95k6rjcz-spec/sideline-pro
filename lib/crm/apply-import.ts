// Server side of the importer: carry out a reviewed ImportPlan.
//
// The plan was built in the browser against a snapshot; this re-checks the
// things that could have changed since (a blank field filled meanwhile, a
// contact point added) and never overwrites a value the reviewer didn't
// explicitly choose to replace. Each row is applied independently, so one
// bad row is reported without losing the rest. Every write is stamped with
// the import id in crm_change_log.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactPointPlan, ImportPlan, RowPlan } from "./import";
import { logChange } from "./server";
import { todayISO } from "./normalise";

type Ctx = {
  admin: SupabaseClient;
  actor: string;
  importId: string;
  sourceLabel: string | null;
  ids: Map<string, string>; // plan placeholder ("new:3", "new:3:0:0", "new-assoc:x") → real id
};

export type ApplyResult = {
  importId: string;
  clubsCreated: number;
  clubsUpdated: number;
  peopleCreated: number;
  appointmentsCreated: number;
  handovers: number;
  contactPointsCreated: number;
  associationsCreated: number;
  reverified: number;
  errors: { row: number; message: string }[];
};

const isDup = (e: { code?: string } | null) => e?.code === "23505";

export async function applyImport(
  admin: SupabaseClient,
  plan: Pick<ImportPlan, "rows">,
  meta: { filename: string | null; sourceLabel: string | null; mapping: unknown; actor: string },
): Promise<ApplyResult> {
  const { data: imp, error } = await admin
    .from("crm_imports")
    .insert({
      filename: meta.filename,
      source_label: meta.sourceLabel,
      row_count: plan.rows.length,
      mapping: meta.mapping ?? {},
      actor_email: meta.actor,
    })
    .select("id")
    .single();
  if (error || !imp) throw new Error(error?.message ?? "Could not start the import");

  const ctx: Ctx = { admin, actor: meta.actor, importId: imp.id, sourceLabel: meta.sourceLabel, ids: new Map() };
  const res: ApplyResult = {
    importId: imp.id, clubsCreated: 0, clubsUpdated: 0, peopleCreated: 0, appointmentsCreated: 0,
    handovers: 0, contactPointsCreated: 0, associationsCreated: 0, reverified: 0, errors: [],
  };

  for (const row of plan.rows) {
    if (row.skip || !row.club) continue;
    try {
      await applyRow(ctx, row, res);
    } catch (err) {
      res.errors.push({ row: row.row, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const { importId: _omit, ...summary } = res;
  void _omit;
  await admin.from("crm_imports").update({ summary }).eq("id", imp.id);
  return res;
}

function sourceFor(ctx: Ctx, row: RowPlan) {
  return {
    source_url: row.source.url,
    source_note: [row.source.note, ctx.sourceLabel].filter(Boolean).join(" — ") || null,
    verified_on: row.source.date ?? (row.source.url ? todayISO() : null),
  };
}

function resolve(ctx: Ctx, id: string | null): string | null {
  if (!id) return null;
  return ctx.ids.get(id) ?? (id.startsWith("new") ? null : id);
}

async function applyRow(ctx: Ctx, row: RowPlan, res: ApplyResult) {
  const { admin, actor, importId } = ctx;
  const club = row.club!;
  const src = sourceFor(ctx, row);
  const verification = src.source_url ? "verified" : "unverified";

  // ---------- club ----------
  let clubId: string;
  if (club.action === "create") {
    const f = club.fills;
    const social: Record<string, string> = {};
    if (f.facebook) social.facebook = f.facebook;
    if (f.instagram) social.instagram = f.instagram;
    const insert = {
      name: club.name,
      aliases: club.aliases,
      suburb: f.suburb ?? null,
      region: f.region ?? null,
      state: f.state ?? "NSW",
      website: f.website ?? null,
      social_links: social,
      approx_players: f.approx_players ?? null,
      approx_teams: f.approx_teams ? Number(f.approx_teams) : null,
      current_systems: f.current_systems ?? null,
      paid_umpires: f.paid_umpires ?? null,
      notes: f.notes ?? null,
      stage: "needs_research",
      ...src,
      created_by_email: actor,
    };
    const { data, error } = await admin.from("crm_clubs").insert(insert).select("id").single();
    if (error || !data) throw new Error(`Club "${club.name}": ${error?.message}`);
    clubId = data.id;
    ctx.ids.set(`new:${row.row}`, clubId);
    res.clubsCreated++;
    await logChange(admin, { entity: "crm_clubs", entity_id: clubId, action: "create", changes: insert, ...src, import_id: importId, actor_email: actor });
  } else {
    const id = resolve(ctx, club.targetId);
    if (!id) throw new Error(`Club "${club.name}": the club it matched was not created`);
    clubId = id;
    const { data: cur } = await admin.from("crm_clubs").select("*").eq("id", clubId).single();
    if (!cur) throw new Error(`Club "${club.name}" no longer exists`);
    const update: Record<string, unknown> = {};
    const social = { ...(cur.social_links ?? {}) } as Record<string, string>;
    const put = (k: string, v: string) => {
      if (k === "facebook" || k === "instagram") social[k] = v;
      else update[k] = k === "approx_teams" ? Number(v) : v;
    };
    // Blanks are filled — but only if they are still blank now.
    for (const [k, v] of Object.entries(club.fills)) {
      if (!v) continue;
      const now = k === "facebook" || k === "instagram" ? social[k] : cur[k];
      if (now === null || now === undefined || now === "") put(k, v);
    }
    // Overwrites only where the reviewer chose "use the sheet's value".
    for (const c of club.conflicts) if (c.decision === "replace") put(c.field, c.incoming);
    if (JSON.stringify(social) !== JSON.stringify(cur.social_links ?? {})) update.social_links = social;
    // Remember the spelling this sheet used, so the next import matches exactly.
    const aliases = new Set<string>(cur.aliases ?? []);
    for (const a of [club.name, ...club.aliases]) {
      if (a && a.trim().toLowerCase() !== String(cur.name).trim().toLowerCase()) aliases.add(a.trim());
    }
    if (aliases.size !== (cur.aliases ?? []).length) update.aliases = [...aliases];
    if (Object.keys(update).length) {
      update.updated_at = new Date().toISOString();
      const { error } = await admin.from("crm_clubs").update(update).eq("id", clubId);
      if (error) throw new Error(`Club "${club.name}": ${error.message}`);
      res.clubsUpdated++;
      const changes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(update)) if (k !== "updated_at") changes[k] = { from: cur[k] ?? null, to: v };
      await logChange(admin, { entity: "crm_clubs", entity_id: clubId, action: "import_update", changes, ...src, import_id: importId, actor_email: actor });
    }
  }

  // ---------- associations ----------
  for (const a of row.associations) {
    let assocId = resolve(ctx, a.targetId);
    if (!assocId) {
      const { data: found } = await admin.from("crm_associations").select("id").ilike("name", a.name).maybeSingle();
      if (found) assocId = found.id;
      else {
        const { data, error } = await admin
          .from("crm_associations")
          .insert({ name: a.name, source_url: src.source_url, source_note: src.source_note, verified_on: src.verified_on })
          .select("id")
          .single();
        if (error || !data) throw new Error(`Association "${a.name}": ${error?.message}`);
        assocId = data.id;
        res.associationsCreated++;
        await logChange(admin, { entity: "crm_associations", entity_id: assocId, action: "create", changes: { name: a.name }, ...src, import_id: importId, actor_email: actor });
      }
      if (a.targetId) ctx.ids.set(a.targetId, assocId!);
    }
    const { error } = await admin
      .from("crm_club_associations")
      .upsert({ club_id: clubId, association_id: assocId, verification, ...src }, { onConflict: "club_id,association_id", ignoreDuplicates: true });
    if (error) throw new Error(`Linking association "${a.name}": ${error.message}`);
  }

  // ---------- club-level contact points ----------
  for (const cp of row.clubContactPoints) {
    if (cp.action === "create" && (await insertCp(ctx, cp, clubId, null, src, verification))) res.contactPointsCreated++;
  }

  // ---------- people, appointments, their contact points ----------
  for (const c of row.contacts) {
    if (c.roleConflict.length && c.conflictDecision === "skip") continue;

    let personId: string | null = null;
    if (c.person.action === "match") personId = resolve(ctx, c.person.targetId);
    else if (c.person.action === "create") {
      if (c.linkToPossible && c.possibleSamePerson[0]) {
        personId = c.possibleSamePerson[0].id;
      } else {
        const { data, error } = await admin
          .from("crm_people")
          .insert({
            full_name: c.name,
            linkedin_url: c.linkedin,
            verification,
            ...src,
            created_by_email: actor,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(`Person "${c.name}": ${error?.message}`);
        personId = data.id;
        res.peopleCreated++;
        await logChange(admin, { entity: "crm_people", entity_id: personId, action: "create", changes: { full_name: c.name }, ...src, import_id: importId, actor_email: actor });
      }
      if (c.person.targetId) ctx.ids.set(c.person.targetId, personId!);
    }

    if (personId && c.appointment.action === "create") {
      const { data: appt, error } = await admin
        .from("crm_appointments")
        .insert({
          club_id: clubId,
          person_id: personId,
          role_category: c.roleKey,
          original_title: c.originalTitle,
          status: c.appointment.status,
          notes: c.notes,
          verification: c.appointment.status === "unverified" ? "unverified" : verification,
          started_on: c.conflictDecision === "handover" ? src.verified_on : null,
          ...src,
          created_by_email: actor,
        })
        .select("id")
        .single();
      if (error || !appt) throw new Error(`Appointment for "${c.name}": ${error?.message}`);
      res.appointmentsCreated++;
      await logChange(admin, { entity: "crm_appointments", entity_id: appt.id, action: "create", changes: { club_id: clubId, person_id: personId, role_category: c.roleKey }, ...src, import_id: importId, actor_email: actor });

      if (c.conflictDecision === "handover") {
        const ended = src.verified_on ?? todayISO();
        for (const old of c.roleConflict) {
          await admin
            .from("crm_appointments")
            .update({ status: "former", ended_on: ended, replaced_by_id: appt.id, updated_at: new Date().toISOString() })
            .eq("id", old.appointmentId)
            .in("status", ["current", "unverified"]);
          res.handovers++;
          await logChange(admin, { entity: "crm_appointments", entity_id: old.appointmentId, action: "handover", changes: { to_person: personId, new_appointment: appt.id, effective_on: ended }, ...src, import_id: importId, actor_email: actor });
        }
        await admin
          .from("crm_contact_points")
          .update({ person_id: personId, updated_at: new Date().toISOString() })
          .eq("club_id", clubId)
          .eq("inbox_type", "role")
          .eq("role_category", c.roleKey);
      }
    } else if (personId && c.appointment.action === "exists" && c.appointment.existingId && src.verified_on) {
      // The sheet confirms what we already hold: record the newer check.
      const { data: cur } = await admin.from("crm_appointments").select("verified_on").eq("id", c.appointment.existingId).single();
      if (cur && (!cur.verified_on || cur.verified_on < src.verified_on)) {
        await admin
          .from("crm_appointments")
          .update({ verified_on: src.verified_on, source_url: src.source_url ?? undefined, verification, updated_at: new Date().toISOString() })
          .eq("id", c.appointment.existingId);
        res.reverified++;
        await logChange(admin, { entity: "crm_appointments", entity_id: c.appointment.existingId, action: "reverify", changes: { verified_on: { from: cur.verified_on, to: src.verified_on } }, ...src, import_id: importId, actor_email: actor });
      }
    }

    for (const cp of c.contactPoints) {
      if (cp.action !== "create") continue;
      const pid = cp.linkPerson ? personId : null;
      if (await insertCp(ctx, cp, cp.inbox_type === "personal" && pid ? null : clubId, pid, src, verification)) {
        res.contactPointsCreated++;
      }
    }
  }
}

async function insertCp(
  ctx: Ctx,
  cp: ContactPointPlan,
  clubId: string | null,
  personId: string | null,
  src: { source_url: string | null; source_note: string | null; verified_on: string | null },
  verification: string,
): Promise<boolean> {
  if (!clubId && !personId) clubId = null;
  const row = {
    club_id: clubId,
    person_id: personId,
    kind: cp.kind,
    value: cp.value,
    value_norm: cp.value_norm,
    inbox_type: cp.inbox_type,
    role_category: cp.role_category,
    outreach_ok: cp.inbox_type !== "work",
    verification,
    ...src,
    created_by_email: ctx.actor,
  };
  if (!row.club_id && !row.person_id) return false;
  const { data, error } = await ctx.admin.from("crm_contact_points").insert(row).select("id").single();
  if (isDup(error)) return false; // added since the plan was made — fine
  if (error || !data) throw new Error(`${cp.kind} ${cp.value}: ${error?.message}`);
  await logChange(ctx.admin, { entity: "crm_contact_points", entity_id: data.id, action: "create", changes: { value: cp.value, inbox_type: cp.inbox_type }, ...src, import_id: ctx.importId, actor_email: ctx.actor });
  return true;
}
