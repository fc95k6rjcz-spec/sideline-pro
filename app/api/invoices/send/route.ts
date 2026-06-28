import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { head } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Fetch the invoice PDF as a Buffer.
 *
 * The Vercel Blob store on this project is PRIVATE, so the raw `pdf_url`
 * returned by `put()` may not be directly fetchable. Tries three strategies
 * in order, logging each failure to console (visible in Vercel function logs):
 *   1) Direct fetch with BLOB_READ_WRITE_TOKEN as Bearer auth
 *   2) head() to mint a fresh signed downloadUrl
 *   3) Plain fetch (works for public blobs)
 */
async function fetchPdfBuffer(pdfUrl: string): Promise<Buffer> {
  const attempts: string[] = [];

  // ── Strategy 1: Bearer-token auth ──────────────────────────────────────
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const res = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
      attempts.push(`bearer:${res.status}`);
      console.warn("[invoice send] Bearer-token PDF fetch failed:", res.status, pdfUrl);
    } catch (err) {
      const m = err instanceof Error ? err.message : "throw";
      attempts.push(`bearer:err(${m})`);
      console.warn("[invoice send] Bearer-token PDF fetch threw:", err);
    }
  } else {
    attempts.push("bearer:no-token");
  }

  // ── Strategy 2: head() → signed downloadUrl ────────────────────────────
  try {
    const meta = await head(pdfUrl);
    const signedUrl =
      (meta as unknown as { downloadUrl?: string }).downloadUrl ?? meta.url;
    const res = await fetch(signedUrl);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
    attempts.push(`head:${res.status}`);
    console.warn(
      "[invoice send] head()→fetch failed:",
      res.status,
      signedUrl.slice(0, 120),
    );
  } catch (err) {
    const m = err instanceof Error ? err.message : "throw";
    attempts.push(`head:err(${m})`);
    console.error("[invoice send] head() threw:", err);
  }

  // ── Strategy 3: plain fetch (public blobs) ─────────────────────────────
  try {
    const res = await fetch(pdfUrl);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
    attempts.push(`plain:${res.status}`);
  } catch (err) {
    const m = err instanceof Error ? err.message : "throw";
    attempts.push(`plain:err(${m})`);
  }

  throw new Error(
    `PDF fetch failed — all strategies exhausted: [${attempts.join(" · ")}]. ` +
      `Re-download the invoice (which re-uploads the PDF) and try again.`,
  );
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const invoiceId =
    body && typeof body === "object" && "invoice_id" in body
      ? String((body as { invoice_id: unknown }).invoice_id)
      : "";
  const overrideEmail =
    body && typeof body === "object" && "to_email" in body
      ? String((body as { to_email: unknown }).to_email ?? "")
      : "";

  if (!invoiceId) {
    return NextResponse.json({ error: "invoice_id required" }, { status: 400 });
  }

  // ── Env vars ───────────────────────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  if (!gmailUser || !gmailPass) {
    return NextResponse.json(
      {
        error:
          "GMAIL_USER and/or GMAIL_APP_PASS not configured in Vercel env vars",
      },
      { status: 500 },
    );
  }

  // ── Invoice lookup ─────────────────────────────────────────────────────
  const admin = createAdminClient();
  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (invErr || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (!invoice.pdf_url) {
    return NextResponse.json(
      { error: "Invoice has no PDF attached — re-download to upload it first" },
      { status: 400 },
    );
  }

  const toEmail =
    overrideEmail && overrideEmail.length > 0
      ? overrideEmail
      : invoice.client_email;
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json(
      { error: "Invoice has no valid recipient email" },
      { status: 400 },
    );
  }

  // ── Build email ────────────────────────────────────────────────────────
  const greeting = invoice.client_name
    ? escapeHtml(invoice.client_name)
    : "there";
  const subject = `Invoice ${invoice.invoice_number} from Sideline Pro Pty Ltd`;
  const totalFormatted = formatMoney(invoice.total_cents, invoice.currency);
  const dueFormatted = formatDate(invoice.due_date);

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;color:#1a1a1a;line-height:1.5;">
    <div style="background:#0A0A0A;padding:24px;text-align:center;">
      <div style="color:#fff;font-weight:900;font-size:22px;letter-spacing:0.5px;">
        SIDELINE <span style="color:#D4A857;">PRO</span>
      </div>
      <div style="color:#D4A857;font-size:10px;letter-spacing:3px;margin-top:4px;text-transform:uppercase;">
        Complete Club Management
      </div>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin-top:0;">Hi ${greeting},</p>
      <p>Please find attached invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> from Sideline Pro Pty Ltd.</p>
      <table style="margin:24px 0;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Amount due</td><td style="padding:4px 0;font-weight:600;">${totalFormatted}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Due date</td><td style="padding:4px 0;font-weight:600;">${dueFormatted}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Reference</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(invoice.invoice_number)}</td></tr>
      </table>
      <p>Payment details are inside the PDF. Please use <strong>${escapeHtml(invoice.invoice_number)}</strong> as the payment reference so we can reconcile it.</p>
      <p>Any questions, just reply to this email.</p>
      <p style="margin-top:32px;">Thanks,<br/><strong>Justin</strong><br/>Sideline Pro Pty Ltd</p>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;">
        Sideline Pro Pty Ltd · ABN 77 697 721 627 · Sydney, Australia
      </div>
    </div>
  </div>
</body></html>`;

  // ── Pull the PDF bytes ─────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fetchPdfBuffer(invoice.pdf_url as string);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't fetch PDF";
    return NextResponse.json(
      { error: `PDF fetch failed: ${message}` },
      { status: 502 },
    );
  }

  // ── Send via Gmail SMTP ────────────────────────────────────────────────
  // Uses an App Password (16-char) generated at
  //   https://myaccount.google.com/apppasswords
  // Works for free with any Google Workspace account.
  const replyTo = process.env.GMAIL_REPLY_TO ?? gmailUser;
  const fromName = process.env.GMAIL_FROM_NAME ?? "Sideline Pro";

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transport.sendMail({
      from: `${fromName} <${gmailUser}>`,
      to: toEmail,
      replyTo,
      subject,
      html,
      attachments: [
        {
          filename: `Sideline_Pro_Invoice_${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
          contentDisposition: "attachment",
          encoding: "base64",
          // Explicit MIME headers — most aggressive way to tell email clients
          // "do not auto-render this inline". Gmail/Outlook respect this fully.
          // Apple Mail.app may STILL inline it as a preview — known Mail.app
          // quirk for PDFs that no Content-Disposition value defeats. Other
          // recipients (Gmail web, Outlook, Thunderbird) will see a clean
          // attachment icon only.
          headers: {
            "Content-Disposition": `attachment; filename="Sideline_Pro_Invoice_${invoice.invoice_number}.pdf"`,
            "Content-Type": `application/pdf; name="Sideline_Pro_Invoice_${invoice.invoice_number}.pdf"`,
          },
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json(
      { error: `Gmail SMTP error: ${message}` },
      { status: 502 },
    );
  }

  // ── Stamp invoice ──────────────────────────────────────────────────────
  await admin
    .from("invoices")
    .update({
      email_sent_at: new Date().toISOString(),
      client_email: toEmail,
    })
    .eq("id", invoiceId);

  return NextResponse.json({ ok: true, sent_to: toEmail, via: "gmail-smtp" });
}
