import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseProposalRow, toPublicProposal } from "@/lib/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * Public: the proposal behind a link. Records the view (first/last viewed,
 * count) and moves a "sent" proposal to "viewed" so the pipeline shows the
 * club has opened it. Drafts are not visible — the link only works once
 * the proposal has been marked sent.
 */
export async function GET(_request: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  if (!token || token.length < 12) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("proposals").select("*").eq("token", token).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = normaliseProposalRow(data as Record<string, unknown>);
  if (row.status === "draft") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    last_viewed_at: now,
    view_count: row.view_count + 1,
    updated_at: now,
  };
  if (!row.first_viewed_at) updates.first_viewed_at = now;
  if (row.status === "sent") updates.status = "viewed";
  await admin.from("proposals").update(updates).eq("id", row.id);

  return NextResponse.json({ proposal: toPublicProposal({ ...row, ...(updates as Partial<typeof row>) }) });
}
