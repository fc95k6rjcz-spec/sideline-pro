import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { normaliseProposalRow } from "@/lib/proposals";

export const runtime = "nodejs";

/** Admin: proposals, newest first; `?prospectId=` narrows to one prospect. */
export async function GET(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prospectId = request.nextUrl.searchParams.get("prospectId")?.trim() || null;

  try {
    const admin = createAdminClient();
    let q = admin.from("proposals").select("*").order("created_at", { ascending: false }).limit(200);
    if (prospectId) q = q.eq("prospect_id", prospectId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      proposals: ((data ?? []) as Record<string, unknown>[]).map(normaliseProposalRow),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
