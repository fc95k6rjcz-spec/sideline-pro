import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

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
      { error: "Invoice has no PDF attached" },
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

  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "Sideline Pro <onboarding@resend.dev>";
  const replyTo = process.env.RESEND_REPLY_TO ?? "rowan@sidelinepro.com.au";

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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        reply_to: replyTo,
        subject,
        html,
        attachments: [
          {
            filename: `Sideline_Pro_Invoice_${invoice.invoice_number}.pdf`,
            path: invoice.pdf_url,
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Resend error ${res.status}: ${text || res.statusText}` },
        { status: 502 },
      );
    }
    // Stamp invoice
    await admin
      .from("invoices")
      .update({
        email_sent_at: new Date().toISOString(),
        client_email: toEmail,
      })
      .eq("id", invoiceId);
    return NextResponse.json({ ok: true, sent_to: toEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
