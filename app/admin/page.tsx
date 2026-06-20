import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = (user?.email ?? "").split("@")[0];

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Admin</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        This is the private side of Sideline Pro. Generate invoices and upload
        receipts from here.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/admin/invoice"
          className="group rounded-2xl border border-neutral-800 bg-neutral-950/50 p-6 transition hover:border-gold/60"
        >
          <div className="text-xs uppercase tracking-wider text-gold">
            New invoice
          </div>
          <div className="mt-2 text-xl font-semibold">Generate an invoice</div>
          <p className="mt-2 text-sm text-neutral-400">
            Fill in client, line items and tax, then download a branded PDF.
          </p>
          <div className="mt-4 text-sm font-semibold text-gold group-hover:underline">
            Start →
          </div>
        </a>

        <a
          href="/admin/receipts"
          className="group rounded-2xl border border-neutral-800 bg-neutral-950/50 p-6 transition hover:border-gold/60"
        >
          <div className="text-xs uppercase tracking-wider text-gold">
            Expenses
          </div>
          <div className="mt-2 text-xl font-semibold">Log an expense</div>
          <p className="mt-2 text-sm text-neutral-400">
            Quick entry on the run — date, description, amount. Attach the
            receipt now or later. Both you and Rowan see the full ledger.
          </p>
          <div className="mt-4 text-sm font-semibold text-gold group-hover:underline">
            Open →
          </div>
        </a>

        <a
          href="/admin/prospects"
          className="group rounded-2xl border border-neutral-800 bg-neutral-950/50 p-6 transition hover:border-gold/60"
        >
          <div className="text-xs uppercase tracking-wider text-gold">
            Sales pipeline
          </div>
          <div className="mt-2 text-xl font-semibold">Prospects</div>
          <p className="mt-2 text-sm text-neutral-400">
            Live spreadsheet of every club worth approaching. Update outreach
            status, owner, last contact and next action in one place.
          </p>
          <div className="mt-4 text-sm font-semibold text-gold group-hover:underline">
            Open →
          </div>
        </a>
      </div>
    </div>
  );
}
