// Server-side pipeline moves that follow from what was logged.

import type { SupabaseClient } from "@supabase/supabase-js";
import { stageDef } from "./constants";
import { logChange } from "./server";
import type { StageKey } from "./types";

const REPLY_OUTCOMES = new Set(["replied", "connected", "interested"]);

/**
 * The stage a club should move to after an activity, or null to stay put.
 * Only ever moves forward from the early stages — it never pulls a club
 * back, and never decides won/lost.
 */
export function stageAfterActivity(
  current: StageKey,
  a: { kind: string; direction: string | null; outcome: string | null },
): StageKey | null {
  if (a.kind === "note" || a.kind === "stage_change") return null;
  const reply = a.direction === "inbound" || REPLY_OUTCOMES.has(a.outcome ?? "");
  if (a.kind === "demo" && ["needs_research", "ready", "contacted", "engaged"].includes(current)) return "demo_booked";
  if (reply && ["needs_research", "ready", "contacted"].includes(current)) return "engaged";
  if (a.direction === "outbound" && ["needs_research", "ready"].includes(current)) return "contacted";
  return null;
}

export async function advanceStageForActivity(
  admin: SupabaseClient,
  activity: { club_id: string; kind: string; direction: string | null; outcome: string | null },
  actor: string,
) {
  const { data: club } = await admin.from("crm_clubs").select("id,stage").eq("id", activity.club_id).single();
  if (!club) return null;
  const next = stageAfterActivity(club.stage as StageKey, activity);
  if (!next) return null;
  const { data: updated } = await admin
    .from("crm_clubs")
    .update({ stage: next, updated_at: new Date().toISOString() })
    .eq("id", club.id)
    .select()
    .single();
  await recordStageChange(admin, club.id, club.stage as StageKey, next, actor, "after logging an activity");
  return updated;
}

export async function recordStageChange(
  admin: SupabaseClient,
  clubId: string,
  from: StageKey,
  to: StageKey,
  actor: string,
  why?: string,
) {
  await admin.from("crm_activities").insert({
    club_id: clubId,
    kind: "stage_change",
    subject: `${stageDef(from).label} → ${stageDef(to).label}`,
    body: why ?? null,
    created_by_email: actor,
  });
  await logChange(admin, {
    entity: "crm_clubs",
    entity_id: clubId,
    action: "stage",
    changes: { stage: { from, to } },
    actor_email: actor,
  });
}
