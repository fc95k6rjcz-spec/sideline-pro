import { NextResponse, type NextRequest } from "next/server";
import { roleLabel } from "@/lib/crm/constants";
import { isUuid } from "@/lib/crm/entities";
import { normEmail, todayISO } from "@/lib/crm/normalise";
import { bad, db, errorMessage, logChange, requireAdmin, unauthorized } from "@/lib/crm/server";

export const runtime = "nodejs";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/**
 * Record a committee change. The outgoing appointment is kept and marked
 * former (with its end date); a new appointment is created for the
 * incoming person — or left vacant — and linked to the old one. The role's
 * shared inbox (treasurer@club) moves to the new holder. Nothing about the
 * previous person is deleted.
 *
 * Body: { appointment_id, effective_on?, person_id? | new_person?: { full_name, email? },
 *         vacant?: boolean, original_title?, source_url?, source_note?, verified_on? }
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON");
  }
  if (!isUuid(body.appointment_id)) return bad("appointment_id required");
  const effective = date(body.effective_on) ?? todayISO();
  const vacant = body.vacant === true;
  const newPerson = (body.new_person ?? null) as { full_name?: unknown; email?: unknown } | null;
  if (!vacant && !isUuid(body.person_id) && !str(newPerson?.full_name)) {
    return bad("Choose who takes over, or mark the role vacant");
  }
  const source = {
    source_url: str(body.source_url),
    source_note: str(body.source_note),
    verified_on: date(body.verified_on) ?? (str(body.source_url) ? todayISO() : null),
  };

  try {
    const admin = db();
    const { data: old } = await admin.from("crm_appointments").select("*").eq("id", body.appointment_id).single();
    if (!old) return bad("Appointment not found", 404);
    if (old.status === "former") return bad("That appointment has already ended");

    // Who takes over.
    let personId: string | null = null;
    let personName: string | null = null;
    if (!vacant) {
      if (isUuid(body.person_id)) {
        const { data: p } = await admin.from("crm_people").select("id,full_name").eq("id", body.person_id).single();
        if (!p) return bad("Person not found", 404);
        personId = p.id;
        personName = p.full_name;
      } else {
        const { data: p, error } = await admin
          .from("crm_people")
          .insert({
            full_name: str(newPerson?.full_name),
            verification: source.source_url ? "verified" : "unverified",
            ...source,
            created_by_email: user.email,
          })
          .select("id,full_name")
          .single();
        if (error || !p) return bad(error?.message ?? "Could not add person", 500);
        personId = p.id;
        personName = p.full_name;
        await logChange(admin, { entity: "crm_people", entity_id: p.id, action: "create", changes: { full_name: p.full_name }, ...source, actor_email: user.email });
        const email = str(newPerson?.email);
        if (email) {
          await admin.from("crm_contact_points").insert({
            person_id: p.id, kind: "email", value: email, value_norm: normEmail(email), inbox_type: "personal",
            verification: source.source_url ? "verified" : "unverified", ...source, created_by_email: user.email,
          });
        }
      }
    }

    const { data: next, error: insErr } = await admin
      .from("crm_appointments")
      .insert({
        club_id: old.club_id,
        person_id: personId,
        role_category: old.role_category,
        original_title: str(body.original_title) ?? old.original_title,
        responsibilities: old.responsibilities,
        status: vacant ? "vacant" : "current",
        started_on: vacant ? null : effective,
        verification: source.source_url ? "verified" : "unverified",
        ...source,
        created_by_email: user.email,
      })
      .select()
      .single();
    if (insErr || !next) return bad(insErr?.message ?? "Could not record the new appointment", 500);

    const { error: updErr } = await admin
      .from("crm_appointments")
      .update({
        status: "former",
        ended_on: old.ended_on ?? effective,
        replaced_by_id: next.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", old.id);
    if (updErr) return bad(updErr.message, 500);

    // The role inbox belongs to the role: point it at whoever holds it now.
    await admin
      .from("crm_contact_points")
      .update({ person_id: personId, updated_at: new Date().toISOString() })
      .eq("club_id", old.club_id)
      .eq("inbox_type", "role")
      .eq("role_category", old.role_category);

    let oldName = "Unknown";
    if (old.person_id) {
      const { data: op } = await admin.from("crm_people").select("full_name").eq("id", old.person_id).single();
      oldName = op?.full_name ?? oldName;
    }
    const summary = `${roleLabel(old.role_category)}: ${oldName} → ${vacant ? "vacant" : personName}`;
    await admin.from("crm_activities").insert({
      club_id: old.club_id,
      person_ids: [old.person_id, personId].filter(Boolean),
      kind: "note",
      subject: `Committee change — ${summary}`,
      body: `Effective ${effective}.${source.source_url ? ` Source: ${source.source_url}` : ""}`,
      created_by_email: user.email,
    });
    await logChange(admin, {
      entity: "crm_appointments",
      entity_id: old.id,
      action: "handover",
      changes: { from_person: old.person_id, to_person: personId, new_appointment: next.id, effective_on: effective },
      ...source,
      actor_email: user.email,
    });

    return NextResponse.json({ ok: true, appointment: next, summary });
  } catch (err) {
    return bad(errorMessage(err, "Handover failed"), 500);
  }
}
