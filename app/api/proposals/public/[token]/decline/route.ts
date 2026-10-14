import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyFounders } from "@/lib/notify-founders";
import { normaliseProposalRow, toPublicProposal } from "@/lib/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * Public: "not right now". Records the reason so the follow-up is informed,
 * and tells the founders. Does not touch the prospect's status — a decline
 * on one proposal is a conversation, not a lost prospect.
 */
export async function POST(request: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  if (!token || token.length < 12) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

  const admin = createAdminClient();
  const { data, error } = await admin.from("proposals").select("*").eq("token", token).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = normaliseProposalRow(data as Record<string, unknown>);
  if (row.status === "draft") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status === "accepted") {
    return NextResponse.json({ error: "This proposal has already been accepted." }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const { data: saved, error: updErr } = await admin
    .from("proposals")
    .update({ status: "declined", declined_at: nowIso, declined_reason: reason || null, updated_at: nowIso })
    .eq("id", row.id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  void notifyFounders({
    subject: `${row.club_name} declined: ${row.title}`,
    text: [
      `${row.club_name} pressed "Not right now" on the proposal "${row.title}".`,
      name ? `From: ${name}` : null,
      ``,
      reason ? `Reason:\n${reason}` : "No reason given.",
    ]
      .filter((l) => l != null)
      .join("\n"),
  });

  return NextResponse.json({ proposal: toPublicProposal(normaliseProposalRow(saved as Record<string, unknown>)) });
}
