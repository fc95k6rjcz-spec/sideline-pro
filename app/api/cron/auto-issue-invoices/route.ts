import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function addMonthsISO(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // clamp to the month's last day (keeps e.g. the 31st sane)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}
function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`).getTime();
  const b = new Date(`${bIso}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function rollDescription(desc: string | null, issueIso: string): string | null {
  if (!desc) return desc;
  const d = new Date(`${issueIso}T00:00:00`);
  const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const re = new RegExp(`(${MONTHS.join("|")})\\s+\\d{4}`, "i");
  return re.test(desc) ? desc.replace(re, label) : desc;
}
function money(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    cents / 100,
  );
}
function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Anchor = {
  id: string;
  prefix: string;
  invoice_number: string;
  client_name: string;
  client_sub_org: string | null;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  next_invoice_date: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  currency: string;
  description: string | null;
  created_by_email: string;
};

/**
 * Daily cron (see vercel.json): for each recurring invoice anchor whose
 * next_invoice_date has come due, DRAFT the next invoice (never sent to the
 * client) and email the owner to review & send it. One draft per anchor per
 * run; the anchor's next_invoice_date advances a month so it can't double-fire.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: anchors, error } = await admin
    .from("invoices")
    .select(
      "id,prefix,invoice_number,client_name,client_sub_org,client_email,issue_date,due_date,next_invoice_date,subtotal_cents,gst_cents,total_cents,currency,description,created_by_email",
    )
    .eq("auto_issue", true)
    .not("next_invoice_date", "is", null)
    .lte("next_invoice_date", today);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const created: Array<{ recipient: string; draft: Record<string, unknown> }> = [];

  for (const a of (anchors ?? []) as Anchor[]) {
    const issue = a.next_invoice_date as string;
    const year = new Date(`${issue}T00:00:00`).getFullYear();
    const termsDays = Math.max(0, daysBetween(a.issue_date, a.due_date));
    const due = addDaysISO(issue, termsDays);

    // Next sequence for this prefix+year, straight from the ledger.
    const { data: existing } = await admin
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${a.prefix}-${year}-%`);
    let max = 0;
    for (const r of existing ?? []) {
      const m = /-(\d+)$/.exec(String(r.invoice_number));
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    const number = `${a.prefix}-${year}-${pad3(max + 1)}`;

    const draftRow = {
      invoice_number: number,
      prefix: a.prefix,
      client_name: a.client_name,
      client_sub_org: a.client_sub_org,
      client_email: a.client_email,
      issue_date: issue,
      due_date: due,
      subtotal_cents: a.subtotal_cents,
      gst_cents: a.gst_cents,
      total_cents: a.total_cents,
      currency: a.currency ?? "AUD",
      description: rollDescription(a.description, issue),
      is_draft: true,
      auto_issue: false,
      paid: false,
      parent_invoice_id: a.id,
      created_by_email: a.created_by_email,
    };

    const { data: inserted, error: insErr } = await admin
      .from("invoices")
      .insert(draftRow)
      .select("id,invoice_number,client_name,total_cents,issue_date,due_date")
      .single();
    if (insErr) {
      // Most likely a unique clash if a draft already exists — skip, don't crash.
      console.warn("[auto-issue] draft insert failed:", insErr.message, number);
      continue;
    }

    // Advance the anchor so it fires again next period, not next day.
    await admin
      .from("invoices")
      .update({ next_invoice_date: addMonthsISO(issue, 1), updated_at: new Date().toISOString() })
      .eq("id", a.id);

    created.push({ recipient: a.created_by_email, draft: inserted as Record<string, unknown> });
  }

  // ── Email a reminder per recipient ──
  let emailed = 0;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sidelinepro.com.au";

  if (created.length > 0 && gmailUser && gmailPass) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    const fromName = process.env.GMAIL_FROM_NAME ?? "Sideline Pro";

    const byRecipient = new Map<string, typeof created>();
    for (const c of created) {
      const list = byRecipient.get(c.recipient) ?? [];
      list.push(c);
      byRecipient.set(c.recipient, list);
    }

    for (const [recipient, drafts] of byRecipient) {
      const rows = drafts
        .map((d) => {
          const inv = d.draft as {
            id: string;
            invoice_number: string;
            client_name: string;
            total_cents: number;
            issue_date: string;
            due_date: string;
          };
          const link = `${siteUrl}/admin/invoice?draft=${inv.id}`;
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${inv.invoice_number}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${inv.client_name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${money(inv.total_cents)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${longDate(inv.due_date)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;"><a href="${link}">Review &amp; send →</a></td>
          </tr>`;
        })
        .join("");
      const html = `<div style="font-family:Arial,sans-serif;color:#1d1d1f;">
        <h2 style="margin:0 0 8px;">Invoices ready to review &amp; send</h2>
        <p style="color:#555;margin:0 0 16px;">These recurring invoices are due to go out. They've been drafted but <strong>not sent</strong> — open each to review and send it.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          <thead><tr>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Invoice</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Client</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Total</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Due</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

      try {
        await transport.sendMail({
          from: `${fromName} <${gmailUser}>`,
          to: recipient,
          subject: `${drafts.length} invoice${drafts.length > 1 ? "s" : ""} ready to send`,
          html,
        });
        emailed += 1;
      } catch (err) {
        console.warn("[auto-issue] reminder email failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, drafted: created.length, emailed });
}
