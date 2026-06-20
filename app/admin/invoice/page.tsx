"use client";

import { useState } from "react";
import InvoiceClient from "./InvoiceClient";
import InvoiceLedger from "./InvoiceLedger";

export default function InvoicePage() {
  // Bump this to force the ledger to reload after a new invoice is saved.
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Invoices</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Every invoice you download is automatically recorded in the ledger below.
          Tick to mark paid, set a recurrence cadence to remind yourself when the next one
          is due, and export the whole list to CSV any time.
        </p>
      </header>

      <InvoiceLedger refreshSignal={refreshSignal} />

      <section id="new-invoice" className="space-y-3 scroll-mt-24">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
          Generate a new invoice
        </h2>
        <p className="max-w-xl text-sm text-neutral-400">
          Fill in the form. Preview updates live. Hit{" "}
          <span className="text-neutral-200">Download PDF</span> when you&apos;re ready —
          the PDF saves to your device and the invoice lands in the ledger automatically.
        </p>
        <InvoiceClient onSaved={() => setRefreshSignal((n) => n + 1)} />
      </section>
    </div>
  );
}
