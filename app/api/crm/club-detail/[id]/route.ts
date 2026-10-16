import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/crm/entities";
import { bad, db, errorMessage, requireAdmin, unauthorized } from "@/lib/crm/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// What the club panel needs beyond the snapshot: the full activity
// timeline (with bodies), finished tasks, the provenance log for the club
// and everything hanging off it, and any proposals sent.
export async function GET(_request: NextRequest, ctx: Params) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return bad("Bad id");

  try {
    const admin = db();
    const { data: club } = await admin.from("crm_clubs").select("id,legacy_prospect_id").eq("id", id).single();
    if (!club) return bad("Not found", 404);

    const [acts, tasks, appts, cps] = await Promise.all([
      admin.from("crm_activities").select("*").eq("club_id", id).order("occurred_at", { ascending: false }).limit(500),
      admin.from("crm_tasks").select("*").eq("club_id", id).order("created_at", { ascending: false }).limit(200),
      admin.from("crm_appointments").select("id").eq("club_id", id),
      admin.from("crm_contact_points").select("id").eq("club_id", id),
    ]);
    const relatedIds = [id, ...(appts.data ?? []).map((r) => r.id), ...(cps.data ?? []).map((r) => r.id)];
    const [log, proposals] = await Promise.all([
      admin.from("crm_change_log").select("*").in("entity_id", relatedIds).order("at", { ascending: false }).limit(200),
      club.legacy_prospect_id
        ? admin.from("proposals").select("id,title,status,sent_at,accepted_at,declined_at,token,created_at").eq("prospect_id", club.legacy_prospect_id)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    return NextResponse.json({
      activities: acts.data ?? [],
      tasks: tasks.data ?? [],
      changeLog: log.data ?? [],
      proposals: proposals.data ?? [],
    });
  } catch (err) {
    return bad(errorMessage(err, "Could not load club"), 500);
  }
}
