import { NextResponse, type NextRequest } from "next/server";
import { ENTITIES, isUuid, sanitise } from "@/lib/crm/entities";
import { bad, db, diff, errorMessage, logChange, requireAdmin, unauthorized } from "@/lib/crm/server";
import { recordStageChange } from "@/lib/crm/stage";
import type { StageKey } from "@/lib/crm/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ entity: string; id: string }> };

export async function PATCH(request: NextRequest, ctx: Params) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  const { entity, id } = await ctx.params;
  const def = ENTITIES[entity];
  if (!def) return bad("Unknown record type", 404);
  if (!isUuid(id)) return bad("Bad id");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Invalid JSON");
  }
  const { row, error } = sanitise(def, body ?? {});
  if (error) return bad(error);
  for (const f of def.required) {
    if (f in row && (row[f] === null || row[f] === "")) return bad(`${f} can't be blank`);
  }
  if (!Object.keys(row).length) return bad("Nothing to update");

  try {
    const admin = db();
    const { data: before } = await admin.from(def.table).select("*").eq("id", id).single();
    if (!before) return bad("Not found", 404);
    const hasUpdatedAt = "updated_at" in before;
    const { data, error: dbError } = await admin
      .from(def.table)
      .update(hasUpdatedAt ? { ...row, updated_at: new Date().toISOString() } : row)
      .eq("id", id)
      .select()
      .single();
    if (dbError) {
      const dup = dbError.code === "23505";
      return bad(dup ? "That already exists in the CRM." : dbError.message, dup ? 409 : 500);
    }
    const changes = diff(before as Record<string, unknown>, row);
    if (Object.keys(changes).length) {
      await logChange(admin, {
        entity: def.table,
        entity_id: id,
        action: "update",
        changes,
        source_url: (row.source_url as string) ?? null,
        source_note: (row.source_note as string) ?? null,
        actor_email: user.email,
      });
    }
    if (entity === "clubs" && changes.stage) {
      await recordStageChange(admin, id, before.stage as StageKey, row.stage as StageKey, user.email);
    }
    return NextResponse.json({ record: data });
  } catch (err) {
    return bad(errorMessage(err, "Update failed"), 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  const { entity, id } = await ctx.params;
  const def = ENTITIES[entity];
  if (!def) return bad("Unknown record type", 404);
  if (!isUuid(id)) return bad("Bad id");

  try {
    const admin = db();
    const { data: before } = await admin.from(def.table).select("*").eq("id", id).single();
    if (!before) return bad("Not found", 404);
    const { error } = await admin.from(def.table).delete().eq("id", id);
    if (error) return bad(error.message, 500);
    // Keep the deleted row in the log so nothing researched is lost for good.
    await logChange(admin, { entity: def.table, entity_id: id, action: "delete", changes: { before }, actor_email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return bad(errorMessage(err, "Delete failed"), 500);
  }
}
