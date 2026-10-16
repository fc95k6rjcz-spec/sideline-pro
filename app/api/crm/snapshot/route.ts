import { NextResponse } from "next/server";
import { bad, db, errorMessage, fetchAll, requireAdmin, unauthorized } from "@/lib/crm/server";
import type { Snapshot } from "@/lib/crm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The whole CRM in one response. At Greater Sydney / NSW scale (hundreds
// of clubs, low thousands of people) this is a few hundred KB and lets the
// board, tables, directory and audience builder filter instantly in the
// browser. Activity bodies are left out; the club panel fetches those.
export async function GET() {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  try {
    const admin = db();
    const [
      associations, clubs, clubAssociations, people, appointments,
      contactPoints, tasks, activities, suppressions, audiences,
    ] = await Promise.all([
      fetchAll(admin, "crm_associations"),
      fetchAll(admin, "crm_clubs"),
      fetchAll(admin, "crm_club_associations", "*", undefined, ["club_id", "association_id"]),
      fetchAll(admin, "crm_people"),
      fetchAll(admin, "crm_appointments"),
      fetchAll(admin, "crm_contact_points"),
      fetchAll(admin, "crm_tasks", "*", ["status", "open"]),
      fetchAll(admin, "crm_activities", "id,club_id,person_ids,kind,direction,outcome,occurred_at"),
      fetchAll(admin, "crm_suppressions", "id,email_norm,reason"),
      fetchAll(admin, "crm_audiences"),
    ]);
    const snapshot = {
      associations, clubs, clubAssociations, people, appointments,
      contactPoints, tasks, activities, suppressions, audiences,
    } as Snapshot;
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return bad(errorMessage(err, "Could not load the CRM"), 500);
  }
}
