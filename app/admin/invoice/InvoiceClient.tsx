"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LineItem = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  rate: number;
};

type Client = {
  id: string;
  prefix: string;
  name: string;
  sub_org: string | null;
  address: string;
  email: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ───── Sideline Pro issuer defaults ─────
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

// ───── helpers ─────
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function currentYear() {
  return new Date().getFullYear();
}
function currentMonthLabel() {
  return new Date().toLocaleString("en-AU", { month: "long", year: "numeric" });
}
function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
function formatDateLong(isoYYYYMMDD: string) {
  if (!isoYYYYMMDD) return "—";
  const d = new Date(`${isoYYYYMMDD}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoYYYYMMDD;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}
function nextSeqFromLocalStorage(prefix: string, year: number) {
  if (typeof window === "undefined" || !prefix) return 1;
  try {
    const key = `invoice_seq_${prefix}_${year}`;
    const raw = window.localStorage.getItem(key);
    const last = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(last) && last > 0 ? last + 1 : 1;
  } catch {
    return 1;
  }
}
function commitSeqToLocalStorage(prefix: string, year: number, seq: number) {
  if (typeof window === "undefined" || !prefix) return;
  try {
    const key = `invoice_seq_${prefix}_${year}`;
    const prevRaw = window.localStorage.getItem(key);
    const prev = prevRaw ? parseInt(prevRaw, 10) : 0;
    if (!Number.isFinite(prev) || seq > prev) {
      window.localStorage.setItem(key, String(seq));
    }
  } catch {
    /* ignore */
  }
}

// ───── component ─────
type Props = {
  onSaved?: () => void;
};

export default function InvoiceClient({ onSaved }: Props = {}) {
  // Issuer (always Sideline Pro)
  const [fromName, setFromName] = useState<string>(ISSUER.name);
  const [fromAbn, setFromAbn] = useState<string>(ISSUER.abn);
  const [fromAcn, setFromAcn] = useState<string>(ISSUER.acn);
  const [fromAddress, setFromAddress] = useState<string>(ISSUER.address);
  const [fromEmail, setFromEmail] = useState<string>(ISSUER.email);

  // Bill-to (populated when a client is selected)
  const [toName, setToName] = useState("");
  const [toSubOrg, setToSubOrg] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toEmail, setToEmail] = useState("");

  // Invoice number: prefix + year + sequence
  const [prefix, setPrefix] = useState("");
  const [year, setYear] = useState(currentYear());
  const [sequence, setSequence] = useState(1);

  useEffect(() => {
    setSequence(nextSeqFromLocalStorage(prefix, year));
  }, [prefix, year]);

  const invoiceNumber = prefix ? `${prefix}-${year}-${pad3(sequence)}` : "—";

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientFormMode, setClientFormMode] = useState<"none" | "add" | "edit">("none");
  const [cfPrefix, setCfPrefix] = useState("");
  const [cfName, setCfName] = useState("");
  const [cfSubOrg, setCfSubOrg] = useState("");
  const [cfAddress, setCfAddress] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const applyClient = useCallback((c: Client) => {
    setSelectedClientId(c.id);
    setToName(c.name);
    setToSubOrg(c.sub_org ?? "");
    setToAddress(c.address);
    setToEmail(c.email);
    setPrefix(c.prefix);
  }, []);

  const loadClients = useCallback(async (): Promise<Client[]> => {
    try {
      const res = await fetch("/api/clients/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = (await res.json()) as { clients: Client[] };
      setClients(data.clients);
      return data.clients;
    } catch (err) {
      console.error("Load clients failed:", err);
      return [];
    }
  }, []);

  // Initial mount: load and auto-select first
  useEffect(() => {
    loadClients().then((cs) => {
      if (cs.length > 0) {
        applyClient(cs[0]);
      }
    });
  }, [loadClients, applyClient]);

  function openAddClient() {
    setCfPrefix("");
    setCfName("");
    setCfSubOrg("");
    setCfAddress("");
    setCfEmail("");
    setClientFormMode("add");
  }

  function openEditClient() {
    if (!selectedClient) return;
    setCfPrefix(selectedClient.prefix);
    setCfName(selectedClient.name);
    setCfSubOrg(selectedClient.sub_org ?? "");
    setCfAddress(selectedClient.address);
    setCfEmail(selectedClient.email);
    setClientFormMode("edit");
  }

  async function handleSaveClient() {
    setError(null);
    setSavingClient(true);
    try {
      const isAdd = clientFormMode === "add";
      const url = isAdd ? "/api/clients/create" : `/api/clients/${selectedClientId}`;
      const method = isAdd ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: cfPrefix,
          name: cfName,
          sub_org: cfSubOrg || null,
          address: cfAddress,
          email: cfEmail,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }
      const data = (await res.json()) as { client: Client };
      const refreshed = await loadClients();
      const saved = refreshed.find((c) => c.id === data.client.id);
      if (saved) applyClient(saved);
      setClientFormMode("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client");
    } finally {
      setSavingClient(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClientId) return;
    if (
      !window.confirm(
        "Delete this client? Past invoices keep the client name baked in.",
      )
    ) {
      return;
    }
    setSavingClient(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      setSelectedClientId("");
      setToName("");
      setToSubOrg("");
      setToAddress("");
      setToEmail("");
      setPrefix("");
      setClientFormMode("none");
      const remaining = await loadClients();
      if (remaining.length > 0) applyClient(remaining[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete client");
    } finally {
      setSavingClient(false);
    }
  }

  // Meta
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(14));
  const [billingPeriod, setBillingPeriod] = useState(currentMonthLabel());
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [currency, setCurrency] = useState("AUD");
  const [taxRate, setTaxRate] = useState(10);
  const [cadenceDays, setCadenceDays] = useState<number>(0);

  // Auto-derive due date from issue date + payment terms. Handles:
  //   "Net 14" / "net14" → 14 days
  //   "Due on receipt"  → 0 days
  // Read-only in the UI now — derived whenever issue date or terms change.
  useEffect(() => {
    if (!issueDate) return;
    let days: number | null = null;
    if (/due\s*on\s*receipt/i.test(paymentTerms)) {
      days = 0;
    } else {
      const match = paymentTerms.match(/net\s*(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (Number.isFinite(parsed)) days = parsed;
      }
    }
    if (days === null) return;
    const base = new Date(`${issueDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    const derived = `${yyyy}-${mm}-${dd}`;
    setDueDate((prev) => (prev === derived ? prev : derived));
  }, [issueDate, paymentTerms]);

  // Items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: makeId(),
      title: `Website Services — ${currentMonthLabel()}`,
      description:
        "Custom website design, development & ongoing hosting, maintenance and support.",
      quantity: 1,
      rate: 598,
    },
  ]);

  // Payment details — hard-coded, NOT editable from the UI.
  // To change BSB / account number, edit PAYMENT_DEFAULTS at the top of this
  // file and redeploy. Keeping these in code is a deliberate security control
  // so a compromised admin login can't redirect payments to a different account.
  const accountName = PAYMENT_DEFAULTS.accountName;
  const bsb = PAYMENT_DEFAULTS.bsb;
  const accountNo = PAYMENT_DEFAULTS.accountNo;

  // Edit lock for issuer details (ABN/ACN/address/email)
  const [editIssuer, setEditIssuer] = useState(false);

  function requestEditIssuerToggle() {
    if (editIssuer) {
      setEditIssuer(false);
      return;
    }
    const ok = window.confirm(
      "Edit your business details? These usually don't change between invoices — make sure you mean to update them.",
    );
    if (ok) setEditIssuer(true);
  }

  // Email-on-download
  const [sendOnDownload, setSendOnDownload] = useState(true);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // UI
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity * i.rate, 0),
    [items],
  );
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: makeId(), title: "", description: "", quantity: 1, rate: 0 },
    ]);
  }
  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  async function handleDownload() {
    setError(null);
    setSendStatus(null);

    if (!selectedClient) {
      setError("Pick a client first (or add one).");
      return;
    }
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      setError("Client must have a valid email.");
      return;
    }

    setGenerating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsPDFModule: any = await import("jspdf");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const autoTableModule: any = await import("jspdf-autotable");
      const JsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default;
      const autoTable = autoTableModule.default ?? autoTableModule;

      const doc = new JsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 56;

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
      doc.text(`Invoice #${invoiceNumber}`, pageWidth - margin, 60, { align: "right" });

      // ===== FROM / BILL TO =====
      let y = bandHeight + 36;
      doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("FROM", margin, y);
      doc.text("BILL TO", pageWidth / 2, y);

      const fromLines = [
        fromName,
        fromAbn ? `ABN ${fromAbn}` : "",
        fromAcn ? `ACN ${fromAcn}` : "",
        ...fromAddress.split("\n"),
        fromEmail,
      ].filter(Boolean);
      const toLines = [
        toName || "—",
        toSubOrg,
        ...toAddress.split("\n"),
        toEmail,
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

      const colWidth = (pageWidth - margin * 2) / 4;
      const metaItems = [
        { label: "ISSUE DATE", value: formatDateLong(issueDate) },
        { label: "DUE DATE", value: formatDateLong(dueDate) },
        { label: "BILLING PERIOD", value: billingPeriod || "—" },
        { label: "PAYMENT TERMS", value: paymentTerms || "—" },
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

      // ===== Items =====
      const tableBody = items.map((it) => [
        (it.title || "—") + (it.description ? `\n${it.description}` : ""),
        String(it.quantity),
        formatMoney(it.rate, currency),
        formatMoney(it.quantity * it.rate, currency),
      ]);

      (autoTable as (d: unknown, o: unknown) => void)(doc, {
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
      const totalsLeft = pageWidth - margin - 220;
      let ty = finalY + 18;

      doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Subtotal", totalsLeft, ty);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(subtotal, currency), pageWidth - margin, ty, { align: "right" });
      ty += 16;

      doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
      doc.setFont("helvetica", "normal");
      doc.text(`GST (${taxRate}%)`, totalsLeft, ty);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(taxAmount, currency), pageWidth - margin, ty, { align: "right" });
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
      doc.text(formatMoney(total, currency), pageWidth - margin - 14, totalRowY + 20, {
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
      drawPair("ACCOUNT NAME", accountName, colA, row1);
      drawPair("BSB", bsb, colB, row1);
      drawPair("ACCOUNT NO.", accountNo, colA, row2);
      drawPair("REFERENCE", invoiceNumber, colB, row2);

      // ===== Footer =====
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(MUTED_TEXT[0], MUTED_TEXT[1], MUTED_TEXT[2]);
      doc.text(
        `Thank you for your business. Questions? Contact ${fromEmail}`,
        pageWidth / 2,
        pageHeight - 50,
        { align: "center" },
      );
      doc.setFontSize(8);
      doc.text(
        `${fromName} · ABN ${fromAbn} · ${fromAddress.replace(/\n/g, ", ")}`,
        pageWidth / 2,
        pageHeight - 34,
        { align: "center" },
      );

      const fileName = `Sideline_Pro_Invoice_${invoiceNumber}.pdf`;

      // 1. Trigger local download immediately
      doc.save(fileName);

      // 2. Upload PDF to blob (best effort)
      let pdfBlobUrl: string | null = null;
      let pdfBlobPathname: string | null = null;
      try {
        const pdfOutput: Blob = doc.output("blob");
        const uploadRes = await fetch(
          `/api/invoices/upload-pdf?filename=${encodeURIComponent(fileName)}`,
          { method: "POST", body: pdfOutput },
        );
        if (uploadRes.ok) {
          const blobData = (await uploadRes.json()) as {
            url?: string;
            pathname?: string;
          };
          pdfBlobUrl = blobData.url ?? null;
          pdfBlobPathname = blobData.pathname ?? null;
        } else {
          console.warn(
            "Invoice PDF blob upload failed:",
            uploadRes.status,
            await uploadRes.text().catch(() => ""),
          );
        }
      } catch (uploadErr) {
        console.warn("Invoice PDF blob upload threw:", uploadErr);
      }

      // 3. Record in ledger (upsert by invoice_number)
      let savedInvoiceId: string | null = null;
      try {
        const nextInvoiceDate = (() => {
          if (!cadenceDays || cadenceDays <= 0) return null;
          const d = new Date(`${issueDate}T00:00:00`);
          d.setDate(d.getDate() + cadenceDays);
          return d.toISOString().slice(0, 10);
        })();

        const summary = items
          .map((it) => it.title || "(untitled)")
          .filter(Boolean)
          .join("; ");

        const createRes = await fetch("/api/invoices/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_number: invoiceNumber,
            prefix,
            client_name: toName,
            client_sub_org: toSubOrg || null,
            client_email: toEmail,
            issue_date: issueDate,
            due_date: dueDate,
            next_invoice_date: nextInvoiceDate,
            billing_cycle_days: cadenceDays > 0 ? cadenceDays : null,
            subtotal_cents: Math.round(subtotal * 100),
            gst_cents: Math.round(taxAmount * 100),
            total_cents: Math.round(total * 100),
            currency,
            description: summary || null,
            pdf_url: pdfBlobUrl,
            pdf_pathname: pdfBlobPathname,
          }),
        });
        if (!createRes.ok) {
          const text = await createRes.text().catch(() => "");
          setError(
            `PDF downloaded, but ledger save failed: ${text || createRes.status}. The file is on your device.`,
          );
        } else {
          const createData = (await createRes.json()) as {
            invoice: { id: string };
          };
          savedInvoiceId = createData.invoice.id;
          onSaved?.();
        }
      } catch (recordErr) {
        console.warn("Invoice ledger save threw:", recordErr);
        setError(
          "PDF downloaded, but ledger save failed (see console). The file is on your device.",
        );
      }

      // 4. Email the invoice if enabled
      if (sendOnDownload) {
        if (!savedInvoiceId) {
          setSendStatus("Not emailed — ledger save failed (see error above).");
        } else if (!pdfBlobUrl) {
          setSendStatus("Not emailed — PDF didn't upload to storage.");
        } else {
          try {
            const sendRes = await fetch("/api/invoices/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoice_id: savedInvoiceId,
                to_email: toEmail,
              }),
            });
            if (sendRes.ok) {
              setSendStatus(`Emailed to ${toEmail} ✓`);
              onSaved?.();
            } else {
              const text = await sendRes.text().catch(() => "");
              setSendStatus(`Email failed: ${text || sendRes.statusText}`);
            }
          } catch (sendErr) {
            setSendStatus(
              `Email failed: ${sendErr instanceof Error ? sendErr.message : "unknown"}`,
            );
          }
        }
      } else {
        setSendStatus("Email skipped (checkbox unchecked).");
      }

      // Commit sequence and bump for next
      commitSeqToLocalStorage(prefix, year, sequence);
      setSequence((s) => s + 1);
    } catch (err) {
      console.error(err);
      setError("Could not generate PDF. Check the console for details.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
      {/* ───── form ───── */}
      <div className="space-y-8">
        <Section title="Invoice number">
          <div className="grid gap-3 sm:grid-cols-[80px_100px_100px_1fr] sm:items-end">
            <Field label="Prefix">
              <input
                readOnly
                className={lockedInputClass(true)}
                value={prefix}
                placeholder="—"
              />
            </Field>
            <Field label="Year">
              <input
                type="number"
                className={inputClass}
                value={year}
                onChange={(e) =>
                  setYear(parseInt(e.target.value, 10) || currentYear())
                }
              />
            </Field>
            <Field label="Sequence">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={sequence}
                onChange={(e) => setSequence(parseInt(e.target.value, 10) || 1)}
              />
            </Field>
            <div className="rounded-md border border-black/10 bg-[#f5f5f7] px-3 py-2 text-sm text-gold">
              {invoiceNumber}
            </div>
          </div>
          <p className="mt-2 text-xs text-[#86868b]">
            Prefix comes from the selected client. Sequence is remembered per
            prefix per year on this browser.
          </p>
        </Section>

        <Section
          title="From"
          accessory={
            <EditToggle
              on={editIssuer}
              onToggle={requestEditIssuerToggle}
              label="issuer"
            />
          }
        >
          <Field label="Business name">
            <input
              readOnly={!editIssuer}
              className={lockedInputClass(!editIssuer)}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ABN">
              <input
                readOnly={!editIssuer}
                className={lockedInputClass(!editIssuer)}
                value={fromAbn}
                onChange={(e) => setFromAbn(e.target.value)}
              />
            </Field>
            <Field label="ACN">
              <input
                readOnly={!editIssuer}
                className={lockedInputClass(!editIssuer)}
                value={fromAcn}
                onChange={(e) => setFromAcn(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Address">
            <textarea
              readOnly={!editIssuer}
              className={lockedInputClass(!editIssuer)}
              rows={2}
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              readOnly={!editIssuer}
              className={lockedInputClass(!editIssuer)}
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Bill to">
          {clientFormMode === "none" ? (
            <>
              {clients.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-black/10 bg-[#FDF1E0] px-3 py-2 text-xs text-[#9A6A1A]">
                    No clients yet. Add your first one to start invoicing.
                  </div>
                  <button
                    type="button"
                    onClick={openAddClient}
                    className="w-full rounded-md border border-gold/40 bg-gold/5 px-3 py-3 text-sm font-semibold text-gold hover:bg-gold/10"
                  >
                    + Add your first client
                  </button>
                </div>
              ) : (
                <>
                  <Field label="Client">
                    <select
                      className={inputClass}
                      value={selectedClientId}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__add__") {
                          openAddClient();
                          return;
                        }
                        const c = clients.find((x) => x.id === v);
                        if (c) applyClient(c);
                      }}
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.prefix})
                        </option>
                      ))}
                      <option value="__add__">+ Add new client…</option>
                    </select>
                  </Field>

                  {selectedClient && (
                    <div className="flex items-start justify-between gap-3 rounded-md border border-black/10 bg-[#f5f5f7] px-3 py-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#1d1d1f]">
                          {selectedClient.name}
                        </div>
                        {selectedClient.sub_org && (
                          <div className="text-[#6e6e73]">
                            {selectedClient.sub_org}
                          </div>
                        )}
                        <div className="whitespace-pre-line text-[#6e6e73]">
                          {selectedClient.address}
                        </div>
                        <div className="text-gold">{selectedClient.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={openEditClient}
                        className="text-xs text-[#6e6e73] hover:text-gold"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <ClientForm
              mode={clientFormMode}
              prefix={cfPrefix}
              name={cfName}
              subOrg={cfSubOrg}
              address={cfAddress}
              email={cfEmail}
              saving={savingClient}
              onPrefixChange={setCfPrefix}
              onNameChange={(v) => {
                setCfName(v);
                // When adding a new client, auto-suggest a prefix from the
                // first letters of significant words. Only fill if the user
                // hasn't typed a prefix yet, so we never overwrite their input.
                if (clientFormMode === "add" && !cfPrefix.trim()) {
                  const stopWords = new Set([
                    "the",
                    "and",
                    "of",
                    "for",
                    "&",
                  ]);
                  const initials = v
                    .split(/\s+/)
                    .filter((w) => w && !stopWords.has(w.toLowerCase()))
                    .map((w) => w[0]?.toUpperCase() ?? "")
                    .join("")
                    .slice(0, 6);
                  if (initials) setCfPrefix(initials);
                }
              }}
              onSubOrgChange={setCfSubOrg}
              onAddressChange={setCfAddress}
              onEmailChange={setCfEmail}
              onCancel={() => setClientFormMode("none")}
              onSave={handleSaveClient}
              onDelete={
                clientFormMode === "edit" ? handleDeleteClient : undefined
              }
            />
          )}
        </Section>

        <Section title="Dates & terms">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue date">
              <input
                type="date"
                className={inputClass}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </Field>
            <Field label="Payment terms">
              <select
                className={inputClass}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              >
                <option value="Due on receipt">Due on receipt</option>
                <option value="Net 7">Net 7</option>
                <option value="Net 14">Net 14</option>
                <option value="Net 21">Net 21</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
            </Field>
            <Field label="Billing period">
              <input
                className={inputClass}
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                placeholder="May 2026"
              />
            </Field>
            <Field label="Due date (auto)">
              <div
                className={
                  inputClass +
                  " pointer-events-none flex items-center justify-between bg-[#f5f5f7] text-[#3a3a3c]"
                }
                aria-readonly
              >
                <span>{formatDateLong(dueDate)}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#86868b]">
                  = issue + {paymentTerms.match(/net\s*(\d+)/i)?.[1] ?? "0"}d
                </span>
              </div>
            </Field>
            <Field label="Currency">
              <select
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="NZD">NZD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
            <Field label="GST / tax rate (%)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Next invoice in">
              <select
                className={inputClass}
                value={cadenceDays}
                onChange={(e) => setCadenceDays(parseInt(e.target.value, 10) || 0)}
              >
                <option value={0}>One-off (no recurrence)</option>
                <option value={28}>Every 28 days</option>
                <option value={30}>Every 30 days</option>
                <option value={90}>Every 90 days</option>
              </select>
            </Field>
          </div>
          {cadenceDays > 0 && (
            <p className="text-xs text-[#86868b]">
              Ledger will show the next invoice as due{" "}
              <span className="text-gold">
                {(() => {
                  const d = new Date(`${issueDate}T00:00:00`);
                  d.setDate(d.getDate() + cadenceDays);
                  return d.toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </span>
              . You still generate it manually when the time comes.
            </p>
          )}
        </Section>

        <Section title="Line items">
          <div className="space-y-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-lg border border-black/10 bg-white p-3"
              >
                <input
                  className={inputClass + " font-semibold"}
                  placeholder="Title (e.g. Website Services — May 2026)"
                  value={it.title}
                  onChange={(e) => updateItem(it.id, { title: e.target.value })}
                />
                <textarea
                  className={inputClass + " mt-2"}
                  rows={2}
                  placeholder="Description (optional, shows in smaller text under the title)"
                  value={it.description}
                  onChange={(e) =>
                    updateItem(it.id, { description: e.target.value })
                  }
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-[80px_120px_120px_30px] sm:items-center">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(it.id, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={it.rate}
                    onChange={(e) =>
                      updateItem(it.id, {
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <div className="rounded-md border border-black/10 bg-[#f5f5f7] px-3 py-2 text-right text-sm font-semibold text-[#1d1d1f]">
                    {formatMoney(it.quantity * it.rate, currency)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="rounded-md border border-black/10 text-sm text-[#6e6e73] hover:border-[#C8332B]/30 hover:text-[#C8332B]"
                    aria-label="Remove line item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold"
          >
            + Add line
          </button>
        </Section>

        <Section title="Payment details (EFT)">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Account name" value={accountName} />
            <ReadOnlyField label="BSB" value={bsb} />
            <ReadOnlyField label="Account number" value={accountNo} />
            <ReadOnlyField
              label="Reference"
              value={invoiceNumber}
              valueClassName="text-gold"
            />
          </div>
          <p className="text-xs text-[#86868b]">
            🔒 Bank details are locked in code for security. To change them, edit
            <span className="mx-1 rounded bg-[#f5f5f7] px-1.5 py-0.5 font-mono text-[#3a3a3c]">
              PAYMENT_DEFAULTS
            </span>
            at the top of{" "}
            <span className="font-mono text-[#6e6e73]">
              app/admin/invoice/InvoiceClient.tsx
            </span>{" "}
            and redeploy.
          </p>
        </Section>

        {/* Email-on-download toggle */}
        <div className="rounded-md border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={sendOnDownload}
              onChange={(e) => setSendOnDownload(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-gold"
            />
            <span className="text-[#3a3a3c]">
              Email PDF to{" "}
              <span className="text-gold">
                {toEmail || "(no client selected)"}
              </span>{" "}
              on download
              <span className="block text-xs text-[#86868b]">
                The invoice PDF is attached and a branded HTML body is included.
                Sender: rowan@sidelinepro.com.au.
              </span>
            </span>
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-4 py-3 text-sm text-[#C8332B]">
            {error}
          </div>
        )}

        {sendStatus && (
          <div
            className={
              "rounded-lg border px-4 py-3 text-sm " +
              (sendStatus.startsWith("Emailed")
                ? "border-black/10 bg-[#E7F6EE] text-[#1B7A47]"
                : "border-black/10 bg-[#f5f5f7] text-[#3a3a3c]")
            }
          >
            {sendStatus}
          </div>
        )}

        <button
          type="button"
          disabled={generating || !selectedClient}
          onClick={handleDownload}
          className="w-full rounded-lg gold-bg px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50"
        >
          {generating
            ? "Generating…"
            : sendOnDownload
              ? "Download PDF + email to client"
              : "Download PDF"}
        </button>
      </div>

      {/* ───── live preview ───── */}
      <aside className="sticky top-24 h-fit rounded-2xl border border-black/10 bg-white p-6">
        <div className="text-xs uppercase tracking-wider text-gold">Live preview</div>
        <PreviewInvoice
          issuer={{
            name: fromName,
            abn: fromAbn,
            acn: fromAcn,
            address: fromAddress,
            email: fromEmail,
          }}
          billTo={{ name: toName, subOrg: toSubOrg, address: toAddress, email: toEmail }}
          invoiceNumber={invoiceNumber}
          issueDate={issueDate}
          dueDate={dueDate}
          billingPeriod={billingPeriod}
          paymentTerms={paymentTerms}
          items={items}
          subtotal={subtotal}
          taxRate={taxRate}
          taxAmount={taxAmount}
          total={total}
          currency={currency}
          payment={{ accountName, bsb, accountNo }}
        />
      </aside>
    </div>
  );
}

// ───── small UI helpers ─────
const inputClass =
  "w-full rounded-[10px] border border-black/15 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#BD8A2C]";

function lockedInputClass(locked: boolean) {
  return locked
    ? "w-full rounded-[10px] border border-black/15 bg-[#f5f5f7] px-3 py-2 text-sm text-[#6e6e73] outline-none focus:border-[#BD8A2C] cursor-not-allowed"
    : inputClass;
}

function Section({
  title,
  children,
  accessory,
}: {
  title: string;
  children: React.ReactNode;
  accessory?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
          {title}
        </h2>
        {accessory}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-[#6e6e73]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f5f5f7] px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-[#86868b]">
        {label}
      </div>
      <div
        className={
          "mt-0.5 font-semibold " + (valueClassName ?? "text-[#1d1d1f]")
        }
      >
        {value}
      </div>
    </div>
  );
}

function EditToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <label
      className={
        "flex cursor-pointer items-center gap-2 text-xs " +
        (on ? "text-gold" : "text-[#86868b] hover:text-[#3a3a3c]")
      }
    >
      <input
        type="checkbox"
        checked={on}
        onChange={onToggle}
        className="h-3.5 w-3.5 accent-gold"
      />
      {on ? `Editing ${label}` : `Edit ${label}`}
    </label>
  );
}

// ───── Client add/edit form ─────
function ClientForm({
  mode,
  prefix,
  name,
  subOrg,
  address,
  email,
  saving,
  onPrefixChange,
  onNameChange,
  onSubOrgChange,
  onAddressChange,
  onEmailChange,
  onCancel,
  onSave,
  onDelete,
}: {
  mode: "add" | "edit";
  prefix: string;
  name: string;
  subOrg: string;
  address: string;
  email: string;
  saving: boolean;
  onPrefixChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubOrgChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-gold/30 bg-gold/[0.03] p-3">
      <div className="text-xs uppercase tracking-wider text-gold">
        {mode === "add" ? "Add new client" : "Edit client"}
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Prefix (required)">
          <input
            className={inputClass}
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value.toUpperCase())}
            placeholder="SNC"
            maxLength={6}
          />
        </Field>
        <Field label="Client name (required)">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Seaforth Netball Club"
          />
        </Field>
      </div>
      <Field label="Sub-organisation (optional)">
        <input
          className={inputClass}
          value={subOrg}
          onChange={(e) => onSubOrgChange(e.target.value)}
          placeholder="e.g. Manly Warringah Netball Association"
        />
      </Field>
      <Field label="Address (required)">
        <textarea
          className={inputClass}
          rows={2}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
        />
      </Field>
      <Field label="Email (required — invoices send here)">
        <input
          type="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="treasurer@example.com.au"
        />
      </Field>
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#6e6e73] hover:text-gold"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#6e6e73] hover:border-[#C8332B]/30 hover:text-[#C8332B] disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-md gold-bg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "add" ? "Add client" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───── Preview ─────
type PreviewProps = {
  issuer: { name: string; abn: string; acn: string; address: string; email: string };
  billTo: { name: string; subOrg: string; address: string; email: string };
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billingPeriod: string;
  paymentTerms: string;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  payment: { accountName: string; bsb: string; accountNo: string };
};

function PreviewInvoice(p: PreviewProps) {
  const fromExtra = [
    p.issuer.abn ? `ABN ${p.issuer.abn}` : "",
    p.issuer.acn ? `ACN ${p.issuer.acn}` : "",
    ...p.issuer.address.split("\n"),
    p.issuer.email,
  ].filter(Boolean);

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-white text-neutral-900 shadow-2xl">
      <div className="flex items-center justify-between bg-[#0A0A0A] px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#E8C988] via-[#D4A857] to-[#B8893A] text-base font-black text-black">
            S
          </div>
          <div>
            <div className="text-sm font-black tracking-tight">
              SIDELINE <span className="text-[#D4A857]">PRO</span>
            </div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-[#D4A857]">
              Complete Club Management
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold">TAX INVOICE</div>
          <div className="text-[10px] text-neutral-300">Invoice #{p.invoiceNumber}</div>
        </div>
      </div>

      <div className="space-y-5 px-6 pb-5 pt-5">
        <div className="grid grid-cols-2 gap-4 text-[10px]">
          <div>
            <div className="font-semibold text-[#D4A857]">FROM</div>
            <div className="mt-1 font-semibold">{p.issuer.name}</div>
            {fromExtra.map((l, i) => (
              <div key={i} className="text-neutral-700">
                {l}
              </div>
            ))}
          </div>
          <div>
            <div className="font-semibold text-[#D4A857]">BILL TO</div>
            <div className="mt-1 font-semibold">{p.billTo.name || "—"}</div>
            {p.billTo.subOrg && (
              <div className="text-neutral-700">{p.billTo.subOrg}</div>
            )}
            <div className="whitespace-pre-line text-neutral-700">{p.billTo.address}</div>
            {p.billTo.email && <div className="text-neutral-700">{p.billTo.email}</div>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-md border border-neutral-200 px-3 py-2 text-[10px]">
          {[
            { l: "ISSUE DATE", v: formatDateLong(p.issueDate) },
            { l: "DUE DATE", v: formatDateLong(p.dueDate) },
            { l: "BILLING PERIOD", v: p.billingPeriod || "—" },
            { l: "PAYMENT TERMS", v: p.paymentTerms || "—" },
          ].map((m) => (
            <div key={m.l}>
              <div className="text-[7px] uppercase text-neutral-500">{m.l}</div>
              <div className="font-semibold">{m.v}</div>
            </div>
          ))}
        </div>

        <table className="w-full text-[10px]">
          <thead className="bg-[#0A0A0A] text-white">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wide">
                Description
              </th>
              <th className="px-3 py-2 text-right font-bold uppercase">Qty</th>
              <th className="px-3 py-2 text-right font-bold uppercase">Unit Price</th>
              <th className="px-3 py-2 text-right font-bold uppercase">
                Amount ({p.currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-200 align-top">
                <td className="px-3 py-2">
                  <div className="font-semibold">{it.title || "—"}</div>
                  {it.description && (
                    <div className="text-neutral-600">{it.description}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{it.quantity}</td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(it.rate, p.currency)}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatMoney(it.quantity * it.rate, p.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-1/2 text-[10px]">
            <div className="flex justify-between py-0.5">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold">{formatMoney(p.subtotal, p.currency)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-neutral-500">GST ({p.taxRate}%)</span>
              <span className="font-semibold">{formatMoney(p.taxAmount, p.currency)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md bg-[#0A0A0A] px-4 py-3 text-white">
          <span className="text-sm font-bold uppercase">Total Due ({p.currency})</span>
          <span className="text-base font-bold">{formatMoney(p.total, p.currency)}</span>
        </div>

        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 p-3 text-[10px]">
          <div className="absolute left-0 top-0 h-full w-1 bg-[#D4A857]" />
          <div className="ml-2">
            <div className="font-semibold">Payment details</div>
            <div className="mt-0.5 text-neutral-600">
              Direct deposit (EFT) — please include the invoice number as the payment reference.
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <PaymentField label="ACCOUNT NAME" value={p.payment.accountName} />
              <PaymentField label="BSB" value={p.payment.bsb} />
              <PaymentField label="ACCOUNT NO." value={p.payment.accountNo} />
              <PaymentField label="REFERENCE" value={p.invoiceNumber} />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-3 text-center text-[9px] text-neutral-500">
          Thank you for your business. Questions? Contact {p.issuer.email}
          <div className="mt-1 text-[8px]">
            {p.issuer.name} · ABN {p.issuer.abn} · {p.issuer.address.replace(/\n/g, ", ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[80px] text-[7px] uppercase text-neutral-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
