import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyFounders } from "@/lib/notify-founders";
import { formatAud, normaliseProposalRow, periodLabel, proposalExpired, toPublicProposal } from "@/lib/proposals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

function sydneyDateShort(d: Date): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", year: "2-digit" }).format(d);
}

/**
 * Public: accept the proposal. Records who accepted it (name, role, email),
 * when, and from where; flips the prospect to Won with a line in its
 * correspondence log; emails the founders. One acceptance per proposal —
 * a second press returns the first record rather than overwriting it.
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
  const s = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const name = s("name").slice(0, 120);
  const role = s("role").slice(0, 120);
  const email = s("email").slice(0, 200);
  const note = s("note").slice(0, 2000);
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Please enter your role at the club." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (body.agree !== true) {
    return NextResponse.json({ error: "Please confirm you are authorised to accept on behalf of the club." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("proposals").select("*").eq("token", token).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = normaliseProposalRow(data as Record<string, unknown>);
  if (row.status === "draft") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status === "accepted") {
    return NextResponse.json({ proposal: toPublicProposal(row), alreadyAccepted: true }, { status: 200 });
  }
  if (proposalExpired(row.valid_until)) {
    return NextResponse.json(
      { error: "This proposal has passed its valid-until date. Get in touch and we will refresh it." },
      { status: 409 },
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const updates = {
    status: "accepted",
    accepted_at: nowIso,
    accepted_name: name,
    accepted_role: role,
    accepted_email: email,
    accepted_note: note || null,
    accepted_ip: clientIp(request),
    accepted_user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    declined_at: null,
    declined_reason: null,
    updated_at: nowIso,
  };
  // The status guard makes a double-submit a no-op rather than a second record.
  const { data: saved, error: updErr } = await admin
    .from("proposals")
    .update(updates)
    .eq("id", row.id)
    .neq("status", "accepted")
    .select()
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!saved) {
    const { data: again } = await admin.from("proposals").select("*").eq("id", row.id).single();
    return NextResponse.json({ proposal: toPublicProposal(normaliseProposalRow(again as Record<string, unknown>)), alreadyAccepted: true });
  }
  const accepted = normaliseProposalRow(saved as Record<string, unknown>);

  // Pipeline: the prospect is Won, with the line in its log.
  if (accepted.prospect_id) {
    const { data: p } = await admin.from("prospects").select("correspondence").eq("id", accepted.prospect_id).maybeSingle();
    const prev = (p as { correspondence?: string | null } | null)?.correspondence ?? "";
    const line = `${sydneyDateShort(now)} — Proposal "${accepted.title}" accepted online by ${name} (${role}, ${email})`;
    await admin
      .from("prospects")
      .update({
        status: "Won",
        last_contacted: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now),
        correspondence: prev ? `${line}\n${prev}` : line,
        updated_at: nowIso,
      })
      .eq("id", accepted.prospect_id);
  }

  const total = accepted.pricing.reduce((n, l) => n + l.amount_cents, 0);
  const pricingLines = accepted.pricing.map(
    (l) => `  - ${l.label}: ${formatAud(l.amount_cents)}${l.period ? ` ${periodLabel(l.period)}` : ""}${l.note ? ` (${l.note})` : ""}`,
  );
  void notifyFounders({
    subject: `✅ ${accepted.club_name} accepted: ${accepted.title}`,
    replyTo: email,
    text: [
      `${accepted.club_name} has accepted the proposal "${accepted.title}".`,
      ``,
      `Accepted by: ${name} (${role})`,
      `Email:       ${email}`,
      `When:        ${new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" }).format(now)}`,
      note ? `Note:        ${note}` : null,
      ``,
      `Pricing agreed:`,
      ...(pricingLines.length ? pricingLines : ["  (no pricing lines on this proposal)"]),
      pricingLines.length > 1 ? `  Total listed: ${formatAud(total)}` : null,
      ``,
      `The prospect has been moved to Won in /admin/prospects.`,
    ]
      .filter((l) => l != null)
      .join("\n"),
  });

  return NextResponse.json({ proposal: toPublicProposal(accepted) });
}
