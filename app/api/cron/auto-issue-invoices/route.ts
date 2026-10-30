import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { put } from "@vercel/blob";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildInvoicePdf,
  sendInvoiceEmailDirect,
  type AutoSendInvoice,
} from "@/lib/invoice-auto-send";

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
const DEFAULT_TERMS_DAYS = 14;

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
  auto_send: boolean | null;
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
      "id,prefix,invoice_number,client_name,client_sub_org,client_email,issue_date,due_date,next_invoice_date,subtotal_cents,gst_cents,total_cents,currency,description,created_by_email,auto_send",
    )
    .eq("auto_issue", true)
    .is("voided_at", null)
    .not("next_invoice_date", "is", null)
    .lte("next_invoice_date", today);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const created: Array<{ recipient: string; draft: Record<string, unknown> }> = [];
  const autoSent: Array<{ recipient: string; invoice: Record<string, unknown> }> = [];

  for (const a of (anchors ?? []) as Anchor[]) {
    const issue = a.next_invoice_date as string;
    const year = new Date(`${issue}T00:00:00`).getFullYear();
    // Copy the anchor's payment terms. An anchor that was due on receipt was a
    // one-off (SNC-2026-016), not the client's terms, so recurring invoices
    // fall back to the standard 14 days rather than being due the day they land.
    const anchorTerms = Math.max(0, daysBetween(a.issue_date, a.due_date));
    const termsDays = anchorTerms > 0 ? anchorTerms : DEFAULT_TERMS_DAYS;
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

    // ── Auto-send: generate the PDF server-side and email the client directly.
    // Safety rails: only when the anchor explicitly has auto_send on AND a
    // valid client email. Any failure leaves the invoice as a reviewable
    // draft and records the error on the row — never a half-sent state.
    const canAutoSend =
      a.auto_send === true &&
      typeof a.client_email === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.client_email);

    if (canAutoSend) {
      const nowIso = new Date().toISOString();
      const invForSend: AutoSendInvoice = {
        id: (inserted as { id: string }).id,
        invoice_number: number,
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
      };
      try {
        const pdfBuffer = buildInvoicePdf(invForSend);
        const pdfName = `Sideline_Pro_Invoice_${number}.pdf`;
        const pdfPath = `invoices/${new Date(`${issue}T00:00:00`).getFullYear()}/${pdfName}`;
        // Blob store is PRIVATE on this project — mirror upload-pdf/route.ts.
        const blob = await put(pdfPath, pdfBuffer, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
        } as unknown as Parameters<typeof put>[2]);

        await sendInvoiceEmailDirect(invForSend, pdfBuffer, a.client_email as string);

        await admin
          .from("invoices")
          .update({
            is_draft: false,
            pdf_url: blob.url,
            pdf_pathname: blob.pathname,
            email_sent_at: nowIso,
            last_auto_send_attempt_at: nowIso,
            last_auto_send_result: "sent",
            updated_at: nowIso,
          })
          .eq("id", invForSend.id);

        autoSent.push({
          recipient: a.created_by_email,
          invoice: inserted as Record<string, unknown>,
        });
        continue; // sent — no review-draft email needed for this one
      } catch (err) {
        const message = err instanceof Error ? err.message : "auto-send failed";
        console.warn("[auto-issue] auto-send failed, leaving draft:", number, message);
        await admin
          .from("invoices")
          .update({
            last_auto_send_attempt_at: nowIso,
            last_auto_send_result: `error: ${message.slice(0, 300)}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invForSend.id);
        // fall through: it stays a draft and goes in the review email
      }
    }

    created.push({ recipient: a.created_by_email, draft: inserted as Record<string, unknown> });
  }

  // ── Email a reminder per recipient ──
  let emailed = 0;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sidelinepro.com.au";

  if ((created.length > 0 || autoSent.length > 0) && gmailUser && gmailPass) {
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

    // ── Confirmation for invoices that were auto-sent (no action needed) ──
    const sentByRecipient = new Map<string, typeof autoSent>();
    for (const s of autoSent) {
      const list = sentByRecipient.get(s.recipient) ?? [];
      list.push(s);
      sentByRecipient.set(s.recipient, list);
    }
    for (const [recipient, sent] of sentByRecipient) {
      const rows = sent
        .map((d) => {
          const inv = d.invoice as {
            invoice_number: string;
            client_name: string;
            total_cents: number;
            due_date: string;
          };
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${inv.invoice_number}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${inv.client_name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${money(inv.total_cents)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${longDate(inv.due_date)}</td>
          </tr>`;
        })
        .join("");
      const html = `<div style="font-family:Arial,sans-serif;color:#1d1d1f;">
        <h2 style="margin:0 0 8px;">Invoices sent automatically</h2>
        <p style="color:#555;margin:0 0 16px;">These recurring invoices were generated and <strong>emailed to the client</strong> just now. No action needed — this is your record. Manage auto-send from the <a href="${siteUrl}/admin/invoice">invoice ledger</a>.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          <thead><tr>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Invoice</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Client</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Total</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #ddd;">Due</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
      try {
        await transport.sendMail({
          from: `${fromName} <${gmailUser}>`,
          to: recipient,
          subject: `${sent.length} invoice${sent.length > 1 ? "s" : ""} sent automatically`,
          html,
        });
        emailed += 1;
      } catch (err) {
        console.warn("[auto-issue] auto-send confirmation email failed:", err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    drafted: created.length,
    auto_sent: autoSent.length,
    emailed,
  });
}
