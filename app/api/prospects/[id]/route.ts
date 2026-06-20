import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const PATCHABLE = [
  "club_name",
  "club_website",
  "website_quality",
  "website_functionality",
  "approx_players",
  "paid_umpires",
  "treasurer_name",
  "treasurer_email",
  "treasurer_phone",
  "target",
  "notes",
  "status",
  "assigned_to",
  "last_contacted",
  "next_action",
  "date_emailed",
  "correspondence",
  "follow_up_date",
] as const;

async function requireUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

export async function PATCH(request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const f of PATCHABLE) {
    if (f in body) {
      const v = body[f];
      // Empty string → null so cells can be cleared
      updates[f] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("prospects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prospect: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("prospects").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
