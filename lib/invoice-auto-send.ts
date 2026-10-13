import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import nodemailer from "nodemailer";

/**
 * Server-side invoice PDF + direct email, used by the auto-issue cron when an
 * anchor has auto_send enabled. The PDF layout mirrors the client-side
 * generator in app/admin/invoice/InvoiceClient.tsx — if you change the design
 * there, change it here too.
 */

// ───── Sideline Pro issuer defaults (mirror InvoiceClient.tsx) ─────
const ISSUER = {
  name: "Sideline Pro Pty Ltd",
  abn: "77 697 721 627",
  acn: "697 721 627",
  address: "Sydney, NSW, Australia",
  email: "rowan@sidelinepro.com.au",
} as const;

const PAYMENT_DEFAULTS = {
  accountName: "Sideline Pro Pty Ltd",
  bsb: "067-873",
  accountNo: "24013248",
} as const;

const GOLD: [number, number, number] = [212, 168, 87];
const INK: [number, number, number] = [10, 10, 10];
const MUTED_BG: [number, number, number] = [248, 248, 248];
const LIGHT_LINE: [number, number, number] = [230, 230, 230];
const MUTED_TEXT: [number, number, number] = [110, 110, 110];

export type AutoSendInvoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_sub_org: string | null;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  currency: string;
  description: string | null;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}
function formatDateLong(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`).getTime();
  const b = new Date(`${bIso}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}
function monthLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Build the invoice PDF server-side; returns the bytes as a Buffer. */
export function buildInvoicePdf(inv: AutoSendInvoice): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const currency = inv.currency ?? "AUD";

  // ===== Header band =====
  const bandHeight = 88;
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(0, 0, pageWidth, bandHeight, "F");

  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.roundedRect(margin, 24, 36, 36, 4, 4, "F");
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("S", margin + 18, 49, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SIDELINE", margin + 50, 44);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text("PRO", margin + 50 + 76, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("COMPLETE CLUB MANAGEMENT", margin + 50, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("TAX INVOICE", pageWidth - margin, 44, { align: "right" });
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice #${inv.invoice_number}`, pageWidth - margin, 60, { align: "right" });

  // ===== FROM / BILL TO =====
  let y = bandHeight + 36;
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("FROM", margin, y);
  doc.text("BILL TO", pageWidth / 2, y);

  const fromLines = [
    ISSUER.name,
    `ABN ${ISSUER.abn}`,
    `ACN ${ISSUER.acn}`,
    ISSUER.address,
    ISSUER.email,
  ];
  const toLines = [
    inv.client_name || "—",
    inv.client_sub_org ?? "",
    inv.client_email ?? "",
  ].filter(Boolean);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(fromLines[0] ?? "", margin, y + 16);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < fromLines.length; i++) {
    doc.text(fromLines[i] ?? "", margin, y + 16 + i * 13);
  }
  doc.setFont("helvetica", "bold");
  doc.text(toLines[0] ?? "", pageWidth / 2, y + 16);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < toLines.length; i++) {
    doc.text(toLines[i] ?? "", pageWidth / 2, y + 16 + i * 13);
  }

  const blockH = Math.max(fromLines.length, toLines.length) * 13 + 16;
  y += blockH + 16;

  // ===== Meta box =====
  const metaBoxHeight = 52;
  doc.setDrawColor(LIGHT_LINE[0], LIGHT_LINE[1], LIGHT_LINE[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - margin * 2, metaBoxHeight, 4, 4, "S");

  const termsDays = Math.max(0, daysBetween(inv.issue_date, inv.due_date));
  const colWidth = (pageWidth - margin * 2) / 4;
  const metaItems = [
    { label: "ISSUE DATE", value: formatDateLong(inv.issue_date) },
    { label: "DUE DATE", value: formatDateLong(inv.due_date) },
    { label: "BILLING PERIOD", value: monthLabel(inv.issue_date) },
    { label: "PAYMENT TERMS", value: termsDays === 0 ? "Due on receipt" : `Net ${termsDays}` },
  ];
  metaItems.forEach((item, idx) => {
    const colX = margin + colWidth * idx + 14;
    doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.label, colX, y + 18);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(item.value, colX, y + 36);
  });

  y += metaBoxHeight + 22;

  // ===== Items (single line item from the invoice row) =====
  const title = (inv.description ?? "Services").split("\n")[0];
  const tableBody = [[
    title,
    "1",
    formatMoney(inv.subtotal_cents, currency),
    formatMoney(inv.subtotal_cents, currency),
  ]];

  autoTable(doc, {
    startY: y,
    head: [["DESCRIPTION", "QTY", "UNIT PRICE", `AMOUNT (${currency})`]],
    body: tableBody,
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: { top: 10, bottom: 10, left: 12, right: 12 },
      lineColor: LIGHT_LINE,
      lineWidth: 0.5,
      valign: "top",
    },
    headStyles: {
      fillColor: INK,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: { top: 8, bottom: 8, left: 12, right: 12 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 50 },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 100, fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  type AutoTableDoc = typeof doc & { lastAutoTable?: { finalY: number } };
  const finalY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? y + 80;

  // ===== Totals =====
  const taxRate = inv.subtotal_cents > 0
    ? Math.round((inv.gst_cents / inv.subtotal_cents) * 100)
    : 10;
  const totalsLeft = pageWidth - margin - 220;
  let ty = finalY + 18;

  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", totalsLeft, ty);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(formatMoney(inv.subtotal_cents, currency), pageWidth - margin, ty, { align: "right" });
  ty += 16;

  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`GST (${taxRate}%)`, totalsLeft, ty);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(formatMoney(inv.gst_cents, currency), pageWidth - margin, ty, { align: "right" });
  ty += 14;

  const totalRowY = ty + 4;
  const totalRowH = 30;
  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.rect(margin, totalRowY, pageWidth - margin * 2, totalRowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL DUE (${currency})`, margin + 14, totalRowY + 20);
  doc.setFontSize(14);
  doc.text(formatMoney(inv.total_cents, currency), pageWidth - margin - 14, totalRowY + 20, {
    align: "right",
  });

  ty = totalRowY + totalRowH + 28;

  // ===== Payment details =====
  const pdBoxH = 88;
  doc.setFillColor(MUTED_BG[0], MUTED_BG[1], MUTED_BG[2]);
  doc.rect(margin, ty, pageWidth - margin * 2, pdBoxH, "F");
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(margin, ty, 4, pdBoxH, "F");

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Payment details", margin + 18, ty + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.text(
    "Direct deposit (EFT) — please include the invoice number as the payment reference.",
    margin + 18,
    ty + 36,
  );

  const colA = margin + 18;
  const colB = margin + (pageWidth - margin * 2) / 2 + 18;
  const row1 = ty + 56;
  const row2 = ty + 74;
  const drawPair = (label: string, value: string, x: number, yPos: number) => {
    doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(label, x, yPos);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(value, x + 84, yPos);
  };
  drawPair("ACCOUNT NAME", PAYMENT_DEFAULTS.accountName, colA, row1);
  drawPair("BSB", PAYMENT_DEFAULTS.bsb, colB, row1);
  drawPair("ACCOUNT NO.", PAYMENT_DEFAULTS.accountNo, colA, row2);
  drawPair("REFERENCE", inv.invoice_number, colB, row2);

  // ===== Footer =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
  doc.text(
    `Thank you for your business. Questions? Contact ${ISSUER.email}`,
    pageWidth / 2,
    pageHeight - 50,
    { align: "center" },
  );
  doc.setFontSize(8);
  doc.text(
    `${ISSUER.name} · ABN ${ISSUER.abn} · ${ISSUER.address}`,
    pageWidth / 2,
    pageHeight - 34,
    { align: "center" },
  );

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Email the invoice (with PDF attached) straight to the client.
 * Mirrors the "invoice" mode of app/api/invoices/send/route.ts.
 * Throws on failure — callers decide how to record the result.
 */
export async function sendInvoiceEmailDirect(
  inv: AutoSendInvoice,
  pdfBuffer: Buffer,
  toEmail: string,
): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  if (!gmailUser || !gmailPass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASS not configured");
  }
  const replyTo = process.env.GMAIL_REPLY_TO ?? gmailUser;
  const fromName = process.env.GMAIL_FROM_NAME ?? "Sideline Pro";

  const greeting = inv.client_name ? escapeHtml(inv.client_name) : "there";
  const num = escapeHtml(inv.invoice_number);
  const totalFormatted = formatMoney(inv.total_cents, inv.currency ?? "AUD");
  const dueFormatted = formatDateLong(inv.due_date);

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
      <p>Please find attached invoice <strong>${num}</strong> from Sideline Pro Pty Ltd.</p>
      <table style="margin:24px 0;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Amount due</td><td style="padding:4px 0;font-weight:600;">${totalFormatted}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Due date</td><td style="padding:4px 0;font-weight:600;">${dueFormatted}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#666;">Reference</td><td style="padding:4px 0;font-weight:600;">${num}</td></tr>
      </table>
      <p>Payment details are inside the PDF. Please use <strong>${num}</strong> as the payment reference so we can reconcile it.</p>
      <p>Any questions, just reply to this email.</p>
      <p style="margin-top:32px;">Thanks,<br/><strong>Justin</strong><br/>Sideline Pro Pty Ltd</p>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center;">
        Sideline Pro Pty Ltd · ABN 77 697 721 627 · Sydney, Australia
      </div>
    </div>
  </div>
</body></html>`;

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transport.sendMail({
    from: `${fromName} <${gmailUser}>`,
    to: toEmail,
    replyTo,
    subject: `Invoice ${inv.invoice_number} from Sideline Pro Pty Ltd`,
    html,
    attachments: [
      {
        filename: `Sideline_Pro_Invoice_${inv.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
        contentDisposition: "attachment",
        encoding: "base64",
        headers: {
          "Content-Disposition": `attachment; filename="Sideline_Pro_Invoice_${inv.invoice_number}.pdf"`,
          "Content-Type": `application/pdf; name="Sideline_Pro_Invoice_${inv.invoice_number}.pdf"`,
        },
      },
    ],
  });
}
