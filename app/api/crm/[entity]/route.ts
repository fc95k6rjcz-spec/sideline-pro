import { NextResponse, type NextRequest } from "next/server";
import { ENTITIES, sanitise } from "@/lib/crm/entities";
import { bad, db, errorMessage, logChange, requireAdmin, unauthorized } from "@/lib/crm/server";
import { advanceStageForActivity } from "@/lib/crm/stage";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string }> };

export async function POST(request: NextRequest, ctx: Params) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  const { entity } = await ctx.params;
  const def = ENTITIES[entity];
  if (!def) return bad("Unknown record type", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON");
  }
  const { row, error } = sanitise(def, body ?? {});
  if (error) return bad(error);
  for (const f of def.required) {
    if (row[f] === undefined || row[f] === null || row[f] === "") return bad(`${f} is required`);
  }
  // Every crm_ table but associations records who added the row.
  if (entity !== "associations") row.created_by_email = user.email;

  try {
    const admin = db();
    const { data, error: dbError } = await admin.from(def.table).insert(row).select().single();
    if (dbError) {
      const dup = dbError.code === "23505";
      return bad(dup ? "That already exists in the CRM." : dbError.message, dup ? 409 : 500);
    }
    await logChange(admin, {
      entity: def.table,
      entity_id: (data as { id?: string }).id ?? null,
      action: "create",
      changes: row,
      source_url: (row.source_url as string) ?? null,
      source_note: (row.source_note as string) ?? null,
      actor_email: user.email,
    });

    // Logging contact moves the club along the pipeline (and says so).
    let club = null;
    if (entity === "activities") {
      club = await advanceStageForActivity(admin, data as { club_id: string; kind: string; direction: string | null; outcome: string | null }, user.email);
    }
    return NextResponse.json({ record: data, club });
  } catch (err) {
    return bad(errorMessage(err, "Create failed"), 500);
  }
}
