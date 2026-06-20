import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const clubName =
    typeof body.club_name === "string" ? body.club_name.trim() : "";
  if (!clubName) {
    return NextResponse.json({ error: "club_name required" }, { status: 400 });
  }

  const PASS_THROUGH = [
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
  const insert: Record<string, unknown> = {
    club_name: clubName,
    created_by_email: user.email,
  };
  for (const f of PASS_THROUGH) {
    const v = (body as Record<string, unknown>)[f];
    if (typeof v === "string" && v.trim().length > 0) {
      insert[f] = v.trim();
    }
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("prospects")
      .insert(insert)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prospect: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
