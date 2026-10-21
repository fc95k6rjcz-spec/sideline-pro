import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Every row the NSW contacts research sheet holds for one club: the
 * campaign contacts, the names found without an email ("research gaps"),
 * and the other published club phones. Read-only — the sheet is the
 * source; re-import it (sql/prospect_contacts_seed.sql) to refresh.
 */
export async function GET(_request: NextRequest, ctx: Params) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("prospect_contacts")
      .select("*")
      .eq("prospect_id", id)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Contacts read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
