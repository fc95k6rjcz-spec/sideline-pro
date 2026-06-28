import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/invoices/summary
 * Returns the totals the Expenses dashboard needs to project a real
 * forward-looking bank balance and a BAS-quarter GST snapshot.
 *
 *   outstanding_cents       — sum of total_cents on unpaid (paid=false) invoices
 *   outstanding_count       — how many unpaid invoices
 *   q_label                 — e.g. "Q4 FY26 · Apr–Jun 2026"
 *   q_gst_collected_cents   — sum of gst_cents on invoices issued in this Q whose paid_date is in this Q
 *                             (i.e. GST actually received this quarter — cash-basis BAS)
 *   q_gst_collected_invoiced_cents — sum of gst_cents on invoices ISSUED in this Q (accrual view)
 *   q_net_collected_cents   — sum of total_cents (incl GST) of invoices PAID this Q
 */

function australianQuarter(today = new Date()) {
  // Australian FY runs Jul–Jun. Quarters Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  const m = today.getMonth(); // 0=Jan
  let qNum: 1 | 2 | 3 | 4;
  let startMonth: number;
  let endMonth: number;
  let fy: number;
  if (m >= 6 && m <= 8) {
    qNum = 1; startMonth = 6; endMonth = 8; fy = today.getFullYear() + 1;
  } else if (m >= 9 && m <= 11) {
    qNum = 2; startMonth = 9; endMonth = 11; fy = today.getFullYear() + 1;
  } else if (m >= 0 && m <= 2) {
    qNum = 3; startMonth = 0; endMonth = 2; fy = today.getFullYear();
  } else {
    qNum = 4; startMonth = 3; endMonth = 5; fy = today.getFullYear();
  }
  const startDate = new Date(qNum === 3 ? today.getFullYear() : qNum === 4 ? today.getFullYear() : today.getFullYear(), startMonth, 1);
  const endDate = new Date(qNum === 3 ? today.getFullYear() : qNum === 4 ? today.getFullYear() : today.getFullYear(), endMonth + 1, 0);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label = `Q${qNum} FY${String(fy).slice(-2)} · ${monthNames[startMonth]}–${monthNames[endMonth]} ${today.getFullYear()}`;
  return {
    qNum,
    fy,
    label,
    startIso: startDate.toISOString().slice(0, 10),
    endIso: endDate.toISOString().slice(0, 10),
  };
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const q = australianQuarter();

  // Outstanding (unpaid) invoices: project these as future inflows
  const { data: unpaid, error: unpaidErr } = await admin
    .from("invoices")
    .select("id,total_cents,gst_cents,due_date,client_name,invoice_number")
    .eq("paid", false);
  if (unpaidErr) {
    return NextResponse.json({ error: unpaidErr.message }, { status: 500 });
  }

  // This-quarter accrual view — invoices ISSUED in Q
  const { data: issuedInQ } = await admin
    .from("invoices")
    .select("total_cents,gst_cents,issue_date")
    .gte("issue_date", q.startIso)
    .lte("issue_date", q.endIso);

  // This-quarter cash view — invoices whose paid_date falls in Q
  const { data: paidInQ } = await admin
    .from("invoices")
    .select("total_cents,gst_cents,paid_date")
    .eq("paid", true)
    .gte("paid_date", q.startIso)
    .lte("paid_date", q.endIso);

  // GST paid on expenses this Q — only AUD expenses (foreign currencies skip GST)
  const { data: qExpenses } = await admin
    .from("expenses")
    .select("amount_cents,gst_cents,date,currency,status")
    .gte("date", q.startIso)
    .lte("date", q.endIso);

  const outstandingCents = (unpaid ?? []).reduce((a, r) => a + (r.total_cents ?? 0), 0);
  const outstandingCount = (unpaid ?? []).length;
  const next = (unpaid ?? [])
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 3)
    .map((r) => ({
      invoice_number: r.invoice_number,
      client_name: r.client_name,
      total_cents: r.total_cents,
      due_date: r.due_date,
    }));

  const qIssuedTotalCents = (issuedInQ ?? []).reduce((a, r) => a + (r.total_cents ?? 0), 0);
  const qIssuedGstCents = (issuedInQ ?? []).reduce((a, r) => a + (r.gst_cents ?? 0), 0);
  const qPaidTotalCents = (paidInQ ?? []).reduce((a, r) => a + (r.total_cents ?? 0), 0);
  const qPaidGstCents = (paidInQ ?? []).reduce((a, r) => a + (r.gst_cents ?? 0), 0);
  const qExpenseTotalCents = (qExpenses ?? [])
    .filter((e) => (e.status ?? "paid") === "paid")
    .reduce((a, r) => a + (r.amount_cents ?? 0), 0);
  // Only AUD expenses can have claimable GST
  const qExpenseGstCents = (qExpenses ?? [])
    .filter((e) => (e.status ?? "paid") === "paid" && (e.currency ?? "AUD") === "AUD")
    .reduce((a, r) => a + (r.gst_cents ?? 0), 0);
  const netGstPayableCents = qPaidGstCents - qExpenseGstCents;

  return NextResponse.json({
    outstanding_cents: outstandingCents,
    outstanding_count: outstandingCount,
    next_due: next,
    quarter: {
      label: q.label,
      start: q.startIso,
      end: q.endIso,
      issued_total_cents: qIssuedTotalCents,
      issued_gst_cents: qIssuedGstCents,
      paid_total_cents: qPaidTotalCents,
      paid_gst_cents: qPaidGstCents,
      expense_total_cents: qExpenseTotalCents,
      expense_gst_cents: qExpenseGstCents,
      net_gst_payable_cents: netGstPayableCents,
    },
  });
}
