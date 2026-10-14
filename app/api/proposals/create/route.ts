import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { newProposalToken, normaliseProposalRow, parseIncludes, parsePricing } from "@/lib/proposals";

export const runtime = "nodejs";

/** Admin: create a proposal (draft) against a prospect. */
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

  const s = (k: string) => (typeof body![k] === "string" ? (body![k] as string).trim() : "");
  const clubName = s("club_name");
  const title = s("title");
  if (!clubName || !title) {
    return NextResponse.json({ error: "club_name and title are required" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    prospect_id: s("prospect_id") || null,
    token: newProposalToken(),
    club_name: clubName,
    title,
    headline: s("headline") || null,
    intro: s("intro") || null,
    includes: parseIncludes(body.includes),
    pricing: parsePricing(body.pricing),
    terms: s("terms") || null,
    pdf_url: s("pdf_url") || null,
    valid_until: s("valid_until") || null,
    status: "draft",
    created_by_email: user.email,
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("proposals").insert(insert).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ proposal: normaliseProposalRow(data as Record<string, unknown>) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
