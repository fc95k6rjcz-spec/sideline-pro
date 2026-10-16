import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/crm/entities";
import { bad, db, errorMessage, logChange, requireAdmin, unauthorized } from "@/lib/crm/server";

export const runtime = "nodejs";

// A club can belong to several associations; this links or unlinks one
// without ever duplicating the club.

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON");
  }
  const { club_id, association_id } = body;
  if (!isUuid(club_id) || !isUuid(association_id)) return bad("club_id and association_id required");
  const verification = ["verified", "unverified", "suggested"].includes(body.verification as string)
    ? (body.verification as string)
    : "unverified";
  const row = {
    club_id,
    association_id,
    verification,
    source_url: typeof body.source_url === "string" && body.source_url.trim() ? body.source_url.trim() : null,
    source_note: typeof body.source_note === "string" && body.source_note.trim() ? body.source_note.trim() : null,
    verified_on: typeof body.verified_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.verified_on) ? body.verified_on : null,
  };
  try {
    const admin = db();
    const { data, error } = await admin
      .from("crm_club_associations")
      .upsert(row, { onConflict: "club_id,association_id" })
      .select()
      .single();
    if (error) return bad(error.message, 500);
    await logChange(admin, { entity: "crm_club_associations", entity_id: club_id, action: "link", changes: row, source_url: row.source_url, source_note: row.source_note, actor_email: user.email });
    return NextResponse.json({ record: data });
  } catch (err) {
    return bad(errorMessage(err, "Link failed"), 500);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  const club_id = request.nextUrl.searchParams.get("club_id");
  const association_id = request.nextUrl.searchParams.get("association_id");
  if (!isUuid(club_id) || !isUuid(association_id)) return bad("club_id and association_id required");
  try {
    const admin = db();
    const { error } = await admin.from("crm_club_associations").delete().eq("club_id", club_id).eq("association_id", association_id);
    if (error) return bad(error.message, 500);
    await logChange(admin, { entity: "crm_club_associations", entity_id: club_id, action: "unlink", changes: { association_id }, actor_email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return bad(errorMessage(err, "Unlink failed"), 500);
  }
}
