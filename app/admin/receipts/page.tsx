import ReceiptsClient from "./ReceiptsClient";

export default function ExpensesPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Expenses</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Expenses &amp; receipts
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Log an expense now, attach the receipt later. Both you and Rowan see
        every entry. GST is auto-calculated at 10% of the gross amount but you
        can override it.
      </p>

      <ReceiptsClient />
    </div>
  );
}
