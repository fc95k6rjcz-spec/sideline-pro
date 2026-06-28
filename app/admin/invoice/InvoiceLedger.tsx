"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  prefix: string;
  client_name: string;
  client_sub_org: string | null;
  issue_date: string;
  due_date: string;
  next_invoice_date: string | null;
  billing_cycle_days: number | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  currency: string;
  description: string | null;
  pdf_url: string | null;
  pdf_pathname: string | null;
  paid: boolean;
  paid_date: string | null;
  client_email: string | null;
  email_sent_at: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

type Filter = "all" | "unpaid" | "paid" | "overdue";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(
      cents / 100,
    );
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function isOverdue(inv: InvoiceRow) {
  if (inv.paid) return false;
  const due = new Date(`${inv.due_date}T00:00:00`);
  return due.getTime() < Date.now();
}

function downloadCsv(rows: InvoiceRow[]) {
  const header = [
    "Invoice #",
    "Client",
    "Sub-organisation",
    "Issue date",
    "Due date",
    "Next invoice",
    "Cadence (days)",
    "Subtotal",
    "GST",
    "Total",
    "Currency",
    "Status",
    "Paid date",
    "PDF URL",
    "Created by",
  ];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.invoice_number,
        r.client_name,
        r.client_sub_org ?? "",
        r.issue_date,
        r.due_date,
        r.next_invoice_date ?? "",
        r.billing_cycle_days ?? "",
        (r.subtotal_cents / 100).toFixed(2),
        (r.gst_cents / 100).toFixed(2),
        (r.total_cents / 100).toFixed(2),
        r.currency,
        r.paid ? "Paid" : isOverdue(r) ? "Overdue" : "Unpaid",
        r.paid_date ?? "",
        r.pdf_url ?? "",
        r.created_by_email,
      ]
        .map(escape)
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Sideline_Pro_Invoices_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Props = {
  refreshSignal?: number; // bump from parent to force a reload
};

export default function InvoiceLedger({ refreshSignal = 0 }: Props) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = (await res.json()) as { invoices: InvoiceRow[] };
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices;
    if (filter === "paid") return invoices.filter((i) => i.paid);
    if (filter === "unpaid") return invoices.filter((i) => !i.paid);
    return invoices.filter(isOverdue);
  }, [invoices, filter]);

  const totals = useMemo(() => {
    const invoiced = invoices.reduce((acc, i) => acc + i.total_cents, 0);
    const received = invoices
      .filter((i) => i.paid)
      .reduce((acc, i) => acc + i.total_cents, 0);
    const outstanding = invoiced - received;
    const overdueCount = invoices.filter(isOverdue).length;
    const overdueAmount = invoices
      .filter(isOverdue)
      .reduce((acc, i) => acc + i.total_cents, 0);
    return { invoiced, received, outstanding, overdueCount, overdueAmount };
  }, [invoices]);

  async function togglePaid(inv: InvoiceRow) {
    setBusyId(inv.id);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !inv.paid }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSend(inv: InvoiceRow) {
    if (!inv.pdf_url) {
      setError(
        `Cannot send ${inv.invoice_number}: no PDF attached. Re-download from the form below to upload one.`,
      );
      return;
    }
    // Prefer the email on file. If we don't have one, prompt — typing in a
    // recipient here also overrides whatever the saved value is.
    const promptDefault = inv.client_email ?? "";
    const promptLabel = inv.email_sent_at
      ? `Resend ${inv.invoice_number} to:`
      : `Send ${inv.invoice_number} to:`;
    const toEmail = window.prompt(promptLabel, promptDefault);
    if (toEmail === null) return; // cancelled
    const trimmed = toEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    setBusyId(inv.id);
    setError(null);
    try {
      const res = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, to_email: trimmed }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Send failed (${res.status})`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(inv: InvoiceRow) {
    if (
      !confirm(
        `Delete ledger entry for ${inv.invoice_number}? The PDF in Blob storage will remain.`,
      )
    ) {
      return;
    }
    setBusyId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
            Invoice ledger
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <Stat label="Invoiced" value={formatMoney(totals.invoiced, "AUD")} />
            <Stat label="Received" value={formatMoney(totals.received, "AUD")} />
            <Stat
              label="Outstanding"
              value={formatMoney(totals.outstanding, "AUD")}
              highlight
            />
            <Stat
              label="Overdue"
              value={
                totals.overdueCount === 0
                  ? "None"
                  : `${totals.overdueCount} (${formatMoney(totals.overdueAmount, "AUD")})`
              }
              warning={totals.overdueCount > 0}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-gold"
          >
            <option value="all">All ({invoices.length})</option>
            <option value="unpaid">
              Unpaid ({invoices.filter((i) => !i.paid).length})
            </option>
            <option value="paid">
              Paid ({invoices.filter((i) => i.paid).length})
            </option>
            <option value="overdue">Overdue ({totals.overdueCount})</option>
          </select>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
            className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#3a3a3c] hover:border-gold hover:text-gold disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={load}
            className="text-xs text-[#6e6e73] hover:text-gold"
            aria-label="Refresh"
          >
            ↻
          </button>
          <a
            href="#new-invoice"
            className="rounded-md gold-bg px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#1d1d1f] hover:opacity-90"
          >
            + New invoice
          </a>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-3 py-2 text-xs text-[#C8332B]">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-[#86868b]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#86868b]">
            {invoices.length === 0
              ? "No invoices yet. Generate one below — every download lands in the ledger automatically."
              : "Nothing matches this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wider text-[#86868b]">
                <tr>
                  <th className="px-3 py-3 text-left">Paid</th>
                  <th className="px-3 py-3 text-left">Invoice #</th>
                  <th className="px-3 py-3 text-left">Client</th>
                  <th className="px-3 py-3 text-left">Issued</th>
                  <th className="px-3 py-3 text-left">Due</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Next due</th>
                  <th className="px-3 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const overdue = isOverdue(inv);
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-black/10 hover:bg-[#fafafa]"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={inv.paid}
                          onChange={() => togglePaid(inv)}
                          disabled={busyId === inv.id}
                          className="h-4 w-4 accent-gold"
                          aria-label="Paid"
                        />
                      </td>
                      <td className="px-3 py-3 text-[#1d1d1f]">
                        {inv.pdf_url ? (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-gold hover:underline"
                          >
                            {inv.invoice_number}
                          </a>
                        ) : (
                          <span className="font-semibold">{inv.invoice_number}</span>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-3 text-[#3a3a3c]">
                        {inv.client_name}
                      </td>
                      <td className="px-3 py-3 text-[#6e6e73]">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="px-3 py-3 text-[#6e6e73]">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-[#1d1d1f]">
                        {formatMoney(inv.total_cents, inv.currency)}
                      </td>
                      <td className="px-3 py-3">
                        {inv.paid ? (
                          <span className="text-xs text-[#1B7A47]">
                            Paid {formatDate(inv.paid_date)}
                          </span>
                        ) : overdue ? (
                          <span className="text-xs font-semibold text-[#C8332B]">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-xs text-[#86868b]">Awaiting</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#6e6e73]">
                        {inv.next_invoice_date ? (
                          <>
                            {formatDate(inv.next_invoice_date)}
                            {inv.billing_cycle_days && (
                              <span className="ml-1 text-[#86868b]">
                                ({inv.billing_cycle_days}d)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[#86868b]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => handleSend(inv)}
                            disabled={busyId === inv.id || !inv.pdf_url}
                            className="text-xs text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              !inv.pdf_url
                                ? "No PDF attached"
                                : inv.email_sent_at
                                  ? `Last sent ${formatDate(inv.email_sent_at.slice(0, 10))}`
                                  : "Email this invoice"
                            }
                          >
                            {inv.email_sent_at ? "Resend" : "Send"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inv)}
                            disabled={busyId === inv.id}
                            className="text-xs text-[#86868b] hover:text-[#C8332B] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  warning = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#86868b]">
        {label}
      </div>
      <div
        className={
          "font-semibold " +
          (warning
            ? "text-[#C8332B]"
            : highlight
              ? "text-gold"
              : "text-[#1D1D1F]")
        }
      >
        {value}
      </div>
    </div>
  );
}
