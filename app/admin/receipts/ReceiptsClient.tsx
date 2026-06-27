"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExpenseStatus = "planned" | "paid";
type PaidBy = "business" | "justin" | "rowan";

type Expense = {
  id: string;
  date: string; // YYYY-MM-DD (for planned: expected date, for paid: actual)
  description: string;
  amount_cents: number;
  gst_cents: number;
  receipt_url: string | null;
  receipt_pathname: string | null;
  receipt_uploaded_at: string | null;
  // New fields
  status: ExpenseStatus | null;
  paid_by: PaidBy | null;
  reimbursed: boolean | null;
  reimbursed_date: string | null;
  reimbursed_txn_id: string | null;
  category: string | null;
  vendor: string | null;
  is_recurring: boolean | null;
  recurring_frequency: string | null;
  // Currency (amount_cents stays in AUD)
  currency: string | null;
  original_amount_cents: number | null;
  fx_rate: number | null;
  // metadata
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

type BusinessState = {
  id: number;
  account_balance_cents: number;
  account_balance_updated_at: string;
  // Cumulative cash-out at the moment the balance was last set. Recent cash
  // out is (current cumulative cash-out) − snapshot_baseline_cents.
  snapshot_baseline_cents: number | null;
  updated_by_email: string | null;
};

type Filter = "all" | "awaiting_reimb" | "reimbursed" | "planned" | "paid_business";

const CATEGORIES = [
  "Coffee & catch-ups",
  "Travel & accommodation",
  "Meals & entertainment",
  "Client gifts",
  "AI & dev tools",
  "Hosting & infrastructure",
  "Software subscriptions",
  "Marketing & advertising",
  "Company admin",
  "Equipment & hardware",
  "Phone & internet",
  "Bank fees",
  "Other",
] as const;

// Currency support — amount_cents stays in AUD (the books); original_amount_cents
// + currency capture what's actually on the receipt. fx_rate is original→AUD.
type Currency = "AUD" | "USD" | "EUR" | "GBP";
const CURRENCIES: Currency[] = ["AUD", "USD", "EUR", "GBP"];
// Default rates — edit per receipt. Approx mid-2026 levels.
const DEFAULT_FX_TO_AUD: Record<Currency, number> = {
  AUD: 1,
  USD: 1.52,
  EUR: 1.65,
  GBP: 1.93,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}
function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
function monthLabel(yyyyMm: string) {
  if (yyyyMm === "all") return "All time";
  const [y, m] = yyyyMm.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
function getYearMonth(dateISO: string) {
  return dateISO.slice(0, 7);
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
function paidByLabel(pb: PaidBy | null | undefined) {
  if (pb === "business") return "Business";
  if (pb === "justin") return "Justin";
  if (pb === "rowan") return "Rowan";
  return "—";
}

// Status derivation: a row is awaiting reimbursement if it's been paid by a
// person and not yet flagged reimbursed.
function isAwaitingReimbursement(e: Expense) {
  const status = e.status ?? "paid";
  return (
    status === "paid" &&
    (e.paid_by === "justin" || e.paid_by === "rowan") &&
    !e.reimbursed
  );
}
function isPlanned(e: Expense) {
  return e.status === "planned";
}

export default function ReceiptsClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Business state (account balance)
  const [businessState, setBusinessState] = useState<BusinessState | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceStr, setBalanceStr] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  // Form state
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [gstStr, setGstStr] = useState("");
  const [autoGst, setAutoGst] = useState(true);
  const [currency, setCurrency] = useState<Currency>("AUD");
  const [fxRateStr, setFxRateStr] = useState("1");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState<string>("");
  const [paidBy, setPaidBy] = useState<PaidBy>("business");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("monthly");
  const [isPlannedForm, setIsPlannedForm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-row state
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [paidByPopoverId, setPaidByPopoverId] = useState<string | null>(null);

  // Inline edit (amount + GST)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDateStr, setEditDateStr] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAmountStr, setEditAmountStr] = useState("");
  const [editGstStr, setEditGstStr] = useState("");
  const [editPaidBy, setEditPaidBy] = useState<PaidBy | "">("");
  const [editCurrency, setEditCurrency] = useState<Currency>("AUD");
  const [editFxRateStr, setEditFxRateStr] = useState("1");

  // Filter
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<Filter>("all");

  // Balance display mode (persisted per-user via localStorage)
  const [balanceMode, setBalanceMode] = useState<"manual" | "auto">("manual");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("sideline_balance_mode");
    if (saved === "manual" || saved === "auto") setBalanceMode(saved);
  }, []);
  function changeBalanceMode(m: "manual" | "auto") {
    setBalanceMode(m);
    try {
      window.localStorage.setItem("sideline_balance_mode", m);
    } catch {}
  }

  // Auto-calc GST — only fires for AUD (can't claim GST on foreign receipts)
  useEffect(() => {
    if (!autoGst) return;
    if (currency !== "AUD") {
      setGstStr("0.00");
      return;
    }
    const cents = parseAmount(amountStr);
    if (cents === null) {
      setGstStr("");
      return;
    }
    const gstCents = Math.round((cents * 10) / 110);
    setGstStr((gstCents / 100).toFixed(2));
  }, [amountStr, autoGst, currency]);

  // When currency changes, reset the FX rate to its default for that currency
  useEffect(() => {
    setFxRateStr(String(DEFAULT_FX_TO_AUD[currency]));
  }, [currency]);

  // Live AUD conversion preview (used in the form)
  const originalAmountCents = parseAmount(amountStr);
  const fxRate = Number(fxRateStr) || 0;
  const audPreviewCents =
    originalAmountCents !== null && fxRate > 0
      ? Math.round(originalAmountCents * fxRate)
      : null;

  // Load
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expenses/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`List failed (${res.status})`);
      const data = (await res.json()) as { expenses: Expense[] };
      setExpenses(data.expenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/business-state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { state: BusinessState };
      setBusinessState(data.state);
    } catch (err) {
      console.error("Load balance failed", err);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    loadBalance();
  }, [loadExpenses, loadBalance]);

  // ── Derived ─────────────────────────────────────────
  const months = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(getYearMonth(e.date)));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    let list = expenses;
    if (monthFilter !== "all") {
      list = list.filter((e) => getYearMonth(e.date) === monthFilter);
    }
    if (statusFilter === "awaiting_reimb") {
      list = list.filter(isAwaitingReimbursement);
    } else if (statusFilter === "reimbursed") {
      list = list.filter((e) => e.reimbursed === true);
    } else if (statusFilter === "planned") {
      list = list.filter(isPlanned);
    } else if (statusFilter === "paid_business") {
      list = list.filter(
        (e) => (e.status ?? "paid") === "paid" && e.paid_by === "business",
      );
    }
    return list;
  }, [expenses, monthFilter, statusFilter]);

  const totals = useMemo(() => {
    const balanceCents = businessState?.account_balance_cents ?? 0;
    const awaitingReimbCents = expenses
      .filter(isAwaitingReimbursement)
      .reduce((acc, e) => acc + e.amount_cents, 0);
    const plannedCents = expenses
      .filter(isPlanned)
      .reduce((acc, e) => acc + e.amount_cents, 0);

    // Cumulative cash-out is deterministic from the data:
    //   - every Business-paid (status=paid) expense's amount
    //   - every Personal-paid + reimbursed expense's amount (the reimbursement
    //     payment leaves the business account too)
    // Recent cash-out = cumulative − baseline saved at last balance reset.
    // This is robust against row updated_at noise.
    const cumulativeBusinessCents = expenses
      .filter(
        (e) =>
          (e.status ?? "paid") === "paid" && e.paid_by === "business",
      )
      .reduce((acc, e) => acc + e.amount_cents, 0);
    const cumulativeReimbursedCents = expenses
      .filter((e) => e.reimbursed && e.paid_by !== "business")
      .reduce((acc, e) => acc + e.amount_cents, 0);
    const cumulativeCashOutCents =
      cumulativeBusinessCents + cumulativeReimbursedCents;
    const baselineCents = businessState?.snapshot_baseline_cents ?? 0;
    const recentBusinessCents = Math.max(
      0,
      cumulativeCashOutCents - baselineCents,
    );

    // Money OUT of the business: recent business spend not yet reflected in
    // the snapshot, awaiting reimbursement (you'll owe), planned outflows.
    const projectedCents =
      balanceCents - recentBusinessCents - awaitingReimbCents - plannedCents;

    // For the filtered list, also show count/totals
    const filteredTotalCents = filtered.reduce(
      (acc, e) => acc + e.amount_cents,
      0,
    );
    const filteredGstCents = filtered.reduce((acc, e) => acc + e.gst_cents, 0);

    return {
      balance: balanceCents,
      awaitingReimb: awaitingReimbCents,
      planned: plannedCents,
      recentBusiness: recentBusinessCents,
      projected: projectedCents,
      filteredCount: filtered.length,
      filteredTotal: filteredTotalCents,
      filteredGst: filteredGstCents,
      missingReceipts: filtered.filter(
        (e) => !e.receipt_url && (e.status ?? "paid") === "paid",
      ).length,
    };
  }, [businessState, expenses, filtered]);

  // ── Balance edit ────────────────────────────────────
  function startEditBalance() {
    setBalanceStr(((businessState?.account_balance_cents ?? 0) / 100).toFixed(2));
    setEditingBalance(true);
    setError(null);
  }
  async function saveBalance() {
    const cents = parseAmount(balanceStr);
    if (cents === null) {
      setError("Enter a valid balance");
      return;
    }
    // Compute current cumulative cash-out so the server can save it as the
    // new baseline. After this save, "Recent cash out" = 0 until new
    // business spend or new reimbursements are logged.
    const cumulativeBusinessCents = expenses
      .filter(
        (e) => (e.status ?? "paid") === "paid" && e.paid_by === "business",
      )
      .reduce((acc, e) => acc + e.amount_cents, 0);
    const cumulativeReimbursedCents = expenses
      .filter((e) => e.reimbursed && e.paid_by !== "business")
      .reduce((acc, e) => acc + e.amount_cents, 0);
    const baselineCents = cumulativeBusinessCents + cumulativeReimbursedCents;

    setSavingBalance(true);
    setError(null);
    try {
      const res = await fetch("/api/business-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_balance_cents: cents,
          snapshot_baseline_cents: baselineCents,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }
      const data = (await res.json()) as { state: BusinessState };
      setBusinessState(data.state);
      setEditingBalance(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save balance");
    } finally {
      setSavingBalance(false);
    }
  }

  // ── Upload helper ───────────────────────────────────
  async function uploadFile(file: File): Promise<{ url: string; pathname: string }> {
    const res = await fetch(
      `/api/receipts/upload?filename=${encodeURIComponent(file.name)}`,
      { method: "POST", body: file },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Upload failed (${res.status})`);
    }
    return (await res.json()) as { url: string; pathname: string };
  }

  // ── Submit new expense ──────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const enteredCents = parseAmount(amountStr);
    if (enteredCents === null) {
      setError("Enter a valid amount");
      return;
    }
    const rate = Number(fxRateStr) || 1;
    if (currency !== "AUD" && rate <= 0) {
      setError("Enter an FX rate to convert to AUD");
      return;
    }
    // amount_cents is always the AUD-equivalent (what the books care about).
    // For AUD entries, original == amount_cents and rate = 1.
    const amountCents = currency === "AUD" ? enteredCents : Math.round(enteredCents * rate);
    const gstCents = currency === "AUD" ? (parseAmount(gstStr) ?? 0) : 0;
    if (!description.trim()) {
      setError("Description required");
      return;
    }

    setSubmitting(true);
    try {
      let receipt: { url: string; pathname: string } | null = null;
      if (pendingFile) {
        receipt = await uploadFile(pendingFile);
      }

      const body: Record<string, unknown> = {
        date,
        description: description.trim(),
        amount_cents: amountCents,
        gst_cents: gstCents,
        status: isPlannedForm ? "planned" : "paid",
        paid_by: paidBy,
        currency,
        original_amount_cents: enteredCents,
        fx_rate: currency === "AUD" ? 1 : rate,
      };
      if (category) body.category = category;
      if (vendor.trim()) body.vendor = vendor.trim();
      if (isRecurring) {
        body.is_recurring = true;
        body.recurring_frequency = recurringFreq;
      }
      if (receipt) {
        body.receipt_url = receipt.url;
        body.receipt_pathname = receipt.pathname;
      }

      const res = await fetch("/api/expenses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create failed (${res.status})`);
      }

      // Reset form
      setDate(todayISO());
      setDescription("");
      setAmountStr("");
      setGstStr("");
      setAutoGst(true);
      setCurrency("AUD");
      setFxRateStr("1");
      setVendor("");
      setCategory("");
      setPaidBy("business");
      setIsRecurring(false);
      setRecurringFreq("monthly");
      setIsPlannedForm(false);
      setPendingFile(null);

      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Attach receipt to existing ──────────────────────
  function startAttach(id: string) {
    setAttachingId(id);
    setTimeout(() => attachInputRef.current?.click(), 0);
  }
  async function handleAttachFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !attachingId) {
      setAttachingId(null);
      return;
    }
    const id = attachingId;
    setError(null);
    try {
      const receipt = await uploadFile(file);
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_url: receipt.url,
          receipt_pathname: receipt.pathname,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Attach failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach receipt");
    } finally {
      setAttachingId(null);
    }
  }

  // ── Inline edit (entire row) ────────────────────────
  function startEdit(exp: Expense) {
    setEditingId(exp.id);
    setEditDateStr(exp.date);
    setEditVendor(exp.vendor ?? "");
    setEditDescription(exp.description);
    setEditCategory(exp.category ?? "");
    // If row has currency data, edit the ORIGINAL amount; otherwise treat as AUD.
    const editingCurrency = ((exp.currency as Currency | null) ?? "AUD") as Currency;
    setEditCurrency(editingCurrency);
    setEditFxRateStr(
      exp.fx_rate != null ? String(exp.fx_rate) : String(DEFAULT_FX_TO_AUD[editingCurrency]),
    );
    const originalCents =
      exp.original_amount_cents != null ? exp.original_amount_cents : exp.amount_cents;
    setEditAmountStr((originalCents / 100).toFixed(2));
    setEditGstStr((exp.gst_cents / 100).toFixed(2));
    setEditPaidBy((exp.paid_by as PaidBy | null) ?? "");
    setError(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDateStr("");
    setEditVendor("");
    setEditDescription("");
    setEditCategory("");
    setEditAmountStr("");
    setEditGstStr("");
    setEditPaidBy("");
    setEditCurrency("AUD");
    setEditFxRateStr("1");
  }
  async function saveEdit(id: string) {
    const enteredCents = parseAmount(editAmountStr);
    if (enteredCents === null) {
      setError("Enter a valid amount");
      return;
    }
    const rate = Number(editFxRateStr) || 1;
    if (editCurrency !== "AUD" && rate <= 0) {
      setError("Enter an FX rate to convert to AUD");
      return;
    }
    const amountCents =
      editCurrency === "AUD" ? enteredCents : Math.round(enteredCents * rate);
    const gstCents = editCurrency === "AUD" ? (parseAmount(editGstStr) ?? 0) : 0;
    if (!editDescription.trim()) {
      setError("Description required");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        date: editDateStr,
        description: editDescription.trim(),
        vendor: editVendor.trim() || null,
        category: editCategory.trim() || null,
        amount_cents: amountCents,
        gst_cents: gstCents,
        currency: editCurrency,
        original_amount_cents: enteredCents,
        fx_rate: editCurrency === "AUD" ? 1 : rate,
      };
      if (editPaidBy === "" || editPaidBy === null) {
        // Leave as-is; server treats omitted field as unchanged
      } else {
        body.paid_by = editPaidBy;
      }
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      cancelEdit();
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update expense");
    } finally {
      setBusyId(null);
    }
  }

  // ── Mark planned → paid ─────────────────────────────
  // Quick-set paid_by from the Status badge popover.
  // Named distinctly from the form's setPaidBy useState setter.
  async function updateRowPaidBy(id: string, paid_by: PaidBy) {
    setPaidByPopoverId(null);
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid_by }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set paid by");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(exp: Expense) {
    const todayStr = todayISO();
    const paidDate = window.prompt(
      `Mark "${exp.description}" as paid. Date paid:`,
      todayStr,
    );
    if (paidDate === null) return;
    setBusyId(exp.id);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", date: paidDate.trim() || todayStr }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark paid");
    } finally {
      setBusyId(null);
    }
  }

  // ── Mark reimbursed ─────────────────────────────────
  async function markReimbursed(exp: Expense) {
    const txnId = window.prompt(
      `Mark "${exp.description}" (${formatMoney(exp.amount_cents)}) as reimbursed.\n\nBank transaction reference (optional):`,
      "",
    );
    if (txnId === null) return; // user cancelled
    setBusyId(exp.id);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reimbursed: true,
          reimbursed_date: todayISO(),
          reimbursed_txn_id: txnId.trim() || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark reimbursed");
    } finally {
      setBusyId(null);
    }
  }

  async function undoReimbursed(exp: Expense) {
    if (!window.confirm("Undo reimbursement?")) return;
    setBusyId(exp.id);
    try {
      const res = await fetch(`/api/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursed: false }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo");
    } finally {
      setBusyId(null);
    }
  }

  // ── Delete ──────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* ── Bank balance + projections ── */}
      <section className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5 sm:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <div className="sm:border-r sm:border-neutral-800 sm:pr-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wider text-gold">
              Bank balance
            </div>
            <div className="flex overflow-hidden rounded-md border border-neutral-700 text-[9px] font-bold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => changeBalanceMode("manual")}
                className={
                  "px-2 py-1 " +
                  (balanceMode === "manual"
                    ? "bg-gold text-ink"
                    : "text-neutral-400 hover:text-neutral-200")
                }
                title="Show the snapshot you typed in. Recent spend appears as a separate card."
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => changeBalanceMode("auto")}
                className={
                  "px-2 py-1 " +
                  (balanceMode === "auto"
                    ? "bg-gold text-ink"
                    : "text-neutral-400 hover:text-neutral-200")
                }
                title="Auto-subtract Business-paid expenses logged since the last balance update."
              >
                Auto
              </button>
            </div>
          </div>
          {editingBalance ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                inputMode="decimal"
                autoFocus
                className={inputClass + " max-w-[140px]"}
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveBalance();
                  if (e.key === "Escape") setEditingBalance(false);
                }}
              />
              <button
                type="button"
                onClick={saveBalance}
                disabled={savingBalance}
                className="text-xs font-semibold text-gold hover:underline disabled:opacity-50"
              >
                {savingBalance ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingBalance(false)}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline gap-3">
              <div
                className={
                  "text-2xl font-bold " +
                  ((balanceMode === "auto"
                    ? totals.balance - totals.recentBusiness
                    : totals.balance) < 0
                    ? "text-red-400"
                    : "text-neutral-100")
                }
              >
                {formatMoney(
                  balanceMode === "auto"
                    ? totals.balance - totals.recentBusiness
                    : totals.balance,
                )}
              </div>
              <button
                type="button"
                onClick={startEditBalance}
                className="rounded-md border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-300 hover:border-gold hover:text-gold"
              >
                {balanceMode === "auto" ? "Reset" : "Update"}
              </button>
            </div>
          )}
          {businessState?.account_balance_updated_at && (
            <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
              {balanceMode === "auto" ? (
                <>
                  Snapshot {formatMoney(totals.balance)} as of{" "}
                  {formatDate(businessState.account_balance_updated_at.slice(0, 10))}
                </>
              ) : (
                <>
                  Updated{" "}
                  {formatDate(businessState.account_balance_updated_at.slice(0, 10))}
                </>
              )}
            </div>
          )}
        </div>

        <Stat
          label="Recent cash out"
          value={formatMoney(totals.recentBusiness)}
          tone={
            balanceMode === "auto"
              ? "muted"
              : totals.recentBusiness > 0
                ? "amber"
                : "muted"
          }
          subline={
            balanceMode === "auto"
              ? "Business spend + reimbursements paid (already deducted above)"
              : "Business spend + reimbursements paid since last balance update"
          }
        />
        <Stat
          label="Awaiting reimbursement"
          value={formatMoney(totals.awaitingReimb)}
          tone={totals.awaitingReimb > 0 ? "amber" : "muted"}
        />
        <Stat
          label="Planned upcoming"
          value={formatMoney(totals.planned)}
          tone={totals.planned > 0 ? "amber" : "muted"}
        />
        <Stat
          label="Projected position"
          value={formatMoney(totals.projected)}
          tone={totals.projected < 0 ? "red" : "good"}
          subline={
            balanceMode === "auto"
              ? "live balance − awaiting − planned"
              : "balance − recent − awaiting − planned"
          }
        />
      </section>

      {/* ── Add expense form ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
          New expense
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[120px_1fr_120px_100px]">
          <Field label={isPlannedForm ? "Expected date" : "Date"}>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              placeholder="e.g. Fuel — trip to Seaforth"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Field>
          <Field label={`Amount (incl. ${currency === "AUD" ? "GST" : "tax"})`}>
            <div className="flex gap-1.5">
              <select
                className={inputClass + " w-[78px] shrink-0"}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                aria-label="Currency"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                inputMode="decimal"
                className={inputClass}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>
            {currency !== "AUD" && (
              <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-neutral-500">
                <span className="uppercase tracking-wider">FX → AUD</span>
                <input
                  inputMode="decimal"
                  className={inputClass + " h-7 w-[80px] text-xs"}
                  value={fxRateStr}
                  onChange={(e) => setFxRateStr(e.target.value)}
                  aria-label="FX rate to AUD"
                />
                {audPreviewCents !== null && (
                  <span className="text-emerald-300/80">
                    = ${(audPreviewCents / 100).toFixed(2)} AUD
                  </span>
                )}
              </div>
            )}
          </Field>
          <Field label="GST">
            <input
              inputMode="decimal"
              className={inputClass}
              placeholder="0.00"
              value={gstStr}
              onChange={(e) => {
                setAutoGst(false);
                setGstStr(e.target.value);
              }}
              disabled={currency !== "AUD"}
              title={currency !== "AUD" ? "GST not claimable on foreign receipts" : undefined}
            />
            {currency !== "AUD" && (
              <p className="mt-1 text-[10px] text-neutral-500">
                GST locked at 0 — not claimable on {currency} receipts.
              </p>
            )}
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category">
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— Pick one —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor (optional)">
            <input
              className={inputClass}
              placeholder="e.g. Apple, Crazy Domains"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </Field>
          <Field label="Paid by">
            <select
              className={inputClass}
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value as PaidBy)}
            >
              <option value="business">Business</option>
              <option value="justin">Justin (reimburse)</option>
              <option value="rowan">Rowan (reimburse)</option>
            </select>
          </Field>
          <Field label="Recurring?">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
              {isRecurring && (
                <select
                  className={inputClass + " flex-1"}
                  value={recurringFreq}
                  onChange={(e) => setRecurringFreq(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-neutral-400">
            <input
              type="checkbox"
              checked={autoGst}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoGst(checked);
                if (!checked) setGstStr("");
              }}
              className="h-3.5 w-3.5 accent-gold"
            />
            Auto-calc GST (10% of amount)
          </label>
          <label className="flex items-center gap-2 text-neutral-400">
            <input
              type="checkbox"
              checked={isPlannedForm}
              onChange={(e) => setIsPlannedForm(e.target.checked)}
              className="h-3.5 w-3.5 accent-gold"
            />
            This is a planned future expense (not yet paid)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-neutral-300 hover:text-gold">
            <span className="rounded-md border border-neutral-800 px-3 py-1.5 font-semibold uppercase tracking-wider hover:border-gold">
              {pendingFile ? `Attached: ${pendingFile.name}` : "+ Attach receipt (optional)"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {pendingFile && (
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-xs text-neutral-500 hover:text-red-300"
            >
              clear file
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg gold-bg px-4 py-3 text-sm font-bold uppercase tracking-wider text-ink hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Saving…" : isPlannedForm ? "Save planned expense" : "Save expense"}
        </button>
      </form>

      {/* ── Filter + table ── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-gold">
              Filter: {monthLabel(monthFilter)}
              {statusFilter !== "all" && ` · ${statusFilterLabel(statusFilter)}`}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <Stat label="Entries" value={String(totals.filteredCount)} />
              <Stat label="Total" value={formatMoney(totals.filteredTotal)} highlight />
              <Stat label="GST" value={formatMoney(totals.filteredGst)} />
            </div>
            {totals.missingReceipts > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                {totals.missingReceipts} paid expense
                {totals.missingReceipts > 1 ? "s" : ""} still missing a receipt
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Filter)}
              className={inputClass + " min-w-[180px]"}
            >
              <option value="all">All entries</option>
              <option value="awaiting_reimb">Awaiting reimbursement</option>
              <option value="reimbursed">Reimbursed</option>
              <option value="paid_business">Paid (business)</option>
              <option value="planned">Planned (upcoming)</option>
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={inputClass + " min-w-[140px]"}
            >
              <option value="all">All time</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                loadExpenses();
                loadBalance();
              }}
              className="text-xs text-neutral-400 hover:text-gold"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/40">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-500">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-500">
              No expenses match this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Vendor</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Category</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-right">GST</th>
                    <th className="px-3 py-3 text-left">Paid by</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">Receipt</th>
                    <th className="px-3 py-3 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const isEditing = editingId === e.id;
                    const status = e.status ?? "paid";
                    const awaiting = isAwaitingReimbursement(e);
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-neutral-900 hover:bg-neutral-900/40"
                      >
                        <td className="px-3 py-3 align-middle text-neutral-300">
                          {isEditing ? (
                            <input
                              type="date"
                              className={cellInputClass + " min-w-[130px]"}
                              value={editDateStr}
                              onChange={(ev) => setEditDateStr(ev.target.value)}
                            />
                          ) : (
                            formatDate(e.date)
                          )}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-3 align-middle text-neutral-300">
                          {isEditing ? (
                            <input
                              className={cellInputClass}
                              placeholder="Vendor"
                              value={editVendor}
                              onChange={(ev) => setEditVendor(ev.target.value)}
                            />
                          ) : (
                            e.vendor || "—"
                          )}
                        </td>
                        <td className="max-w-[280px] truncate px-3 py-3 align-middle text-neutral-100">
                          {isEditing ? (
                            <input
                              className={cellInputClass}
                              placeholder="Description"
                              value={editDescription}
                              onChange={(ev) =>
                                setEditDescription(ev.target.value)
                              }
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") saveEdit(e.id);
                                else if (ev.key === "Escape") cancelEdit();
                              }}
                            />
                          ) : (
                            <>
                              {e.description}
                              {e.is_recurring && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">
                                  ↻ {e.recurring_frequency ?? "recurring"}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="max-w-[180px] px-3 py-3 align-middle text-neutral-400">
                          {isEditing ? (
                            <select
                              className={cellInputClass}
                              value={editCategory}
                              onChange={(ev) => setEditCategory(ev.target.value)}
                            >
                              <option value="">—</option>
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="block truncate">
                              {e.category || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle text-right text-neutral-100">
                          {isEditing ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5">
                                <select
                                  className={cellInputClass + " w-[72px]"}
                                  value={editCurrency}
                                  onChange={(ev) => {
                                    const next = ev.target.value as Currency;
                                    setEditCurrency(next);
                                    setEditFxRateStr(String(DEFAULT_FX_TO_AUD[next]));
                                    if (next !== "AUD") setEditGstStr("0.00");
                                  }}
                                  aria-label="Currency"
                                >
                                  {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  inputMode="decimal"
                                  autoFocus
                                  className={cellInputClass + " min-w-[90px] text-right"}
                                  value={editAmountStr}
                                  onChange={(ev) => setEditAmountStr(ev.target.value)}
                                  onKeyDown={(ev) => {
                                    if (ev.key === "Enter") saveEdit(e.id);
                                    else if (ev.key === "Escape") cancelEdit();
                                  }}
                                />
                              </div>
                              {editCurrency !== "AUD" && (
                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                                  <span className="uppercase tracking-wider">FX</span>
                                  <input
                                    inputMode="decimal"
                                    className={cellInputClass + " h-6 w-[64px] text-right text-[11px]"}
                                    value={editFxRateStr}
                                    onChange={(ev) => setEditFxRateStr(ev.target.value)}
                                    aria-label="FX rate to AUD"
                                  />
                                  {parseAmount(editAmountStr) !== null &&
                                    Number(editFxRateStr) > 0 && (
                                      <span className="text-emerald-300/80">
                                        = $
                                        {(
                                          (parseAmount(editAmountStr) as number) *
                                          Number(editFxRateStr) /
                                          100
                                        ).toFixed(2)}{" "}
                                        AUD
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span>{formatMoney(e.amount_cents)}</span>
                              {e.currency && e.currency !== "AUD" && e.original_amount_cents !== null && (
                                <span
                                  className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-sky-950/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300"
                                  title={
                                    e.fx_rate
                                      ? `Original ${e.currency} ${(e.original_amount_cents / 100).toFixed(2)} @ ${e.fx_rate.toFixed(3)} → AUD`
                                      : undefined
                                  }
                                >
                                  {e.currency} {(e.original_amount_cents / 100).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle text-right text-neutral-400">
                          {isEditing ? (
                            <div className="flex flex-col items-end">
                              <input
                                inputMode="decimal"
                                className={
                                  cellInputClass +
                                  " min-w-[70px] text-right" +
                                  (editCurrency !== "AUD" ? " opacity-50" : "")
                                }
                                value={editGstStr}
                                onChange={(ev) => setEditGstStr(ev.target.value)}
                                onKeyDown={(ev) => {
                                  if (ev.key === "Enter") saveEdit(e.id);
                                  else if (ev.key === "Escape") cancelEdit();
                                }}
                                disabled={editCurrency !== "AUD"}
                                title={
                                  editCurrency !== "AUD"
                                    ? "GST not claimable on foreign receipts"
                                    : undefined
                                }
                              />
                              {editCurrency !== "AUD" && (
                                <span className="mt-0.5 text-[9px] text-neutral-500">
                                  N/A on {editCurrency}
                                </span>
                              )}
                            </div>
                          ) : (
                            formatMoney(e.gst_cents)
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle text-xs text-neutral-300">
                          {isEditing ? (
                            <select
                              className={cellInputClass + " min-w-[100px]"}
                              value={editPaidBy}
                              onChange={(ev) =>
                                setEditPaidBy(ev.target.value as PaidBy | "")
                              }
                            >
                              <option value="">—</option>
                              <option value="business">Business</option>
                              <option value="justin">Justin</option>
                              <option value="rowan">Rowan</option>
                            </select>
                          ) : (
                            paidByLabel(e.paid_by)
                          )}
                        </td>
                        <td className="relative px-3 py-3">
                          {status === "paid" && !awaiting && !e.reimbursed && !e.paid_by ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPaidByPopoverId(
                                  paidByPopoverId === e.id ? null : e.id,
                                )
                              }
                              disabled={busyId === e.id}
                              className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-300 hover:bg-neutral-700 hover:text-gold disabled:opacity-50"
                              aria-label="Set who paid this expense"
                            >
                              Paid ▾
                            </button>
                          ) : (
                            <StatusBadge
                              status={status}
                              awaiting={awaiting}
                              reimbursed={e.reimbursed}
                              reimbursedDate={e.reimbursed_date}
                            />
                          )}
                          {paidByPopoverId === e.id && (
                            <>
                              {/* click-outside catcher */}
                              <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setPaidByPopoverId(null)}
                                className="fixed inset-0 z-20 cursor-default"
                              />
                              <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-2xl">
                                <button
                                  type="button"
                                  onClick={() => updateRowPaidBy(e.id, "business")}
                                  className="block w-full px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-800 hover:text-gold"
                                >
                                  Paid by{" "}
                                  <span className="font-semibold">Business</span>
                                  <span className="block text-[10px] text-neutral-500">
                                    no reimbursement needed
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateRowPaidBy(e.id, "justin")}
                                  className="block w-full border-t border-neutral-800 px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-800 hover:text-amber-300"
                                >
                                  Paid by{" "}
                                  <span className="font-semibold">Justin</span>
                                  <span className="block text-[10px] text-neutral-500">
                                    → awaiting reimbursement
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateRowPaidBy(e.id, "rowan")}
                                  className="block w-full border-t border-neutral-800 px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-800 hover:text-amber-300"
                                >
                                  Paid by{" "}
                                  <span className="font-semibold">Rowan</span>
                                  <span className="block text-[10px] text-neutral-500">
                                    → awaiting reimbursement
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {e.receipt_url ? (
                            <a
                              href={e.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gold hover:underline"
                            >
                              View
                            </a>
                          ) : status === "paid" ? (
                            <button
                              type="button"
                              onClick={() => startAttach(e.id)}
                              disabled={attachingId === e.id}
                              className="text-xs text-neutral-400 hover:text-gold hover:underline disabled:opacity-50"
                            >
                              {attachingId === e.id ? "Uploading…" : "Attach"}
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => saveEdit(e.id)}
                                disabled={busyId === e.id}
                                className="text-xs font-semibold text-gold hover:underline disabled:opacity-50"
                              >
                                {busyId === e.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={busyId === e.id}
                                className="text-xs text-neutral-500 hover:text-neutral-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-3">
                              {status === "planned" && (
                                <button
                                  type="button"
                                  onClick={() => markPaid(e)}
                                  disabled={busyId === e.id}
                                  className="text-xs font-semibold text-gold hover:underline disabled:opacity-50"
                                >
                                  Mark paid
                                </button>
                              )}
                              {awaiting && (
                                <button
                                  type="button"
                                  onClick={() => markReimbursed(e)}
                                  disabled={busyId === e.id}
                                  className="text-xs font-semibold text-emerald-400 hover:underline disabled:opacity-50"
                                >
                                  Reimbursed
                                </button>
                              )}
                              {e.reimbursed && (
                                <button
                                  type="button"
                                  onClick={() => undoReimbursed(e)}
                                  disabled={busyId === e.id}
                                  className="text-xs text-neutral-500 hover:text-amber-300 disabled:opacity-50"
                                  title="Undo reimbursement"
                                >
                                  Undo
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => startEdit(e)}
                                className="text-xs text-neutral-500 hover:text-gold"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(e.id)}
                                disabled={busyId === e.id}
                                className="text-xs text-neutral-500 hover:text-red-300 disabled:opacity-50"
                              >
                                {busyId === e.id ? "…" : "Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <input
          ref={attachInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={handleAttachFileChange}
        />
      </section>
    </div>
  );
}

// ── tiny UI helpers ──
const inputClass =
  "block w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold focus:ring-1 focus:ring-gold";

// Compact variant for inline-edit cells inside the expenses table.
// px-2 py-1, text-xs, w-full so the cell drives the width.
const cellInputClass =
  "block w-full rounded border border-gold/60 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-gold focus:ring-1 focus:ring-gold";

function statusFilterLabel(f: Filter): string {
  if (f === "awaiting_reimb") return "Awaiting reimbursement";
  if (f === "reimbursed") return "Reimbursed";
  if (f === "planned") return "Planned";
  if (f === "paid_business") return "Paid (business)";
  return "All";
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
      <span className="text-xs uppercase tracking-wider text-neutral-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  tone,
  subline,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "good" | "amber" | "red" | "muted";
  subline?: string;
}) {
  let valueClass = "text-neutral-200";
  if (tone === "good") valueClass = "text-emerald-400";
  else if (tone === "amber") valueClass = "text-amber-400";
  else if (tone === "red") valueClass = "text-red-400";
  else if (tone === "muted") valueClass = "text-neutral-400";
  if (highlight) valueClass = "text-gold";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={"font-semibold " + valueClass}>{value}</div>
      {subline && (
        <div className="text-[10px] text-neutral-600">{subline}</div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  awaiting,
  reimbursed,
  reimbursedDate,
}: {
  status: ExpenseStatus;
  awaiting: boolean;
  reimbursed: boolean | null | undefined;
  reimbursedDate: string | null | undefined;
}) {
  if (status === "planned") {
    return (
      <span className="rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
        Planned
      </span>
    );
  }
  if (awaiting) {
    return (
      <span className="rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
        Awaiting reimb.
      </span>
    );
  }
  if (reimbursed) {
    return (
      <span
        className="rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300"
        title={reimbursedDate ?? undefined}
      >
        Reimbursed{reimbursedDate ? ` ${formatDate(reimbursedDate)}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-inset ring-emerald-500/40">
      <span aria-hidden>✓</span>
      Paid
    </span>
  );
}
