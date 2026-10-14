import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { isProposalStatus, normaliseProposalRow, parseIncludes, parsePricing } from "@/lib/proposals";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const TEXT_FIELDS = ["club_name", "title", "headline", "intro", "terms", "pdf_url", "valid_until"] as const;

async function requireUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

/**
 * Admin: edit a proposal. Content edits are allowed until it is accepted;
 * after that the record is what the club agreed to and stays as it was.
 * `status: "sent"` stamps sent_at and moves the prospect to "Proposal sent"
 * when it is still earlier in the pipeline.
 */
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

  const admin = createAdminClient();
  const { data: existing, error: readErr } = await admin.from("proposals").select("*").eq("id", id).maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const current = normaliseProposalRow(existing as Record<string, unknown>);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const contentKeys = [...TEXT_FIELDS, "includes", "pricing"];
  const touchingContent = contentKeys.some((k) => k in body!);
  if (touchingContent && current.status === "accepted") {
    return NextResponse.json({ error: "This proposal has been accepted; its content is locked." }, { status: 409 });
  }
  for (const f of TEXT_FIELDS) {
    if (f in body) {
      const v = body[f];
      updates[f] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }
  if ("includes" in body) updates.includes = parseIncludes(body.includes);
  if ("pricing" in body) updates.pricing = parsePricing(body.pricing);

  if ("status" in body) {
    const next = body.status;
    if (!isProposalStatus(next)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
    if (current.status === "accepted" && next !== "accepted") {
      return NextResponse.json({ error: "An accepted proposal cannot be reopened; create a new one." }, { status: 409 });
    }
    updates.status = next;
    if (next === "sent" && !current.sent_at) updates.sent_at = new Date().toISOString();
  }

  try {
    const { data, error } = await admin.from("proposals").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const saved = normaliseProposalRow(data as Record<string, unknown>);

    if (updates.status === "sent" && saved.prospect_id) {
      const { data: p } = await admin.from("prospects").select("status").eq("id", saved.prospect_id).maybeSingle();
      const st = (p as { status?: string | null } | null)?.status ?? "";
      if (["", "New", "Contacted", "Interested", "Meeting booked"].includes(st)) {
        await admin
          .from("prospects")
          .update({ status: "Proposal sent", updated_at: new Date().toISOString() })
          .eq("id", saved.prospect_id);
      }
    }
    return NextResponse.json({ proposal: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Admin: delete a draft. Sent or accepted proposals stay as the record. */
export async function DELETE(_request: NextRequest, ctx: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("proposals").select("status").eq("id", id).maybeSingle();
  const status = (existing as { status?: string } | null)?.status;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 409 });
  }
  const { error } = await admin.from("proposals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
