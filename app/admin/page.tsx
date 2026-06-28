import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = (user?.email ?? "").split("@")[0];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
        Admin
      </p>
      <h1 className="mt-2 text-[40px] font-semibold leading-tight tracking-[-0.018em]">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2.5 max-w-[520px] text-[17px] leading-[1.5] text-[#6e6e73]">
        This is the private side of Sideline Pro. Generate invoices and upload
        receipts from here.
      </p>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/admin/invoice"
          className="group rounded-[20px] border border-black/10 bg-white p-[26px] transition duration-300 hover:-translate-y-[3px] hover:border-gold/60 hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)]"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">
            New invoice
          </div>
          <div className="mt-2.5 text-[21px] font-semibold tracking-[-0.01em]">
            Generate an invoice
          </div>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Fill in client, line items and tax, then download a branded PDF.
          </p>
          <div className="mt-4 text-sm font-semibold text-gold group-hover:underline">
            Start →
          </div>
        </a>

        <a
          href="/admin/receipts"
          className="group rounded-[20px] border border-black/10 bg-white p-[26px] transition duration-300 hover:-translate-y-[3px] hover:border-gold/60 hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)]"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">
            Expenses
          </div>
          <div className="mt-2.5 text-[21px] font-semibold tracking-[-0.01em]">
            Log an expense
          </div>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Quick entry on the run — date, description, amount. Attach the
            receipt now or later. Both you and Rowan see the full ledger.
          </p>
          <div className="mt-4 text-sm font-semibold text-gold group-hover:underline">
            Open →
          </div>
        </a>

        <a
          href="/admin/prospects"
          className="group rounded-[20px] border border-black/10 bg-white p-[26px] transition duration-300 hover:-translate-y-[3px] hover:border-gold/60 hover:shadow-[0_14px_38px_rgba(0,0,0,0.09)]"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">
            Sales pipeline
          </div>
          <div className="mt-2.5 text-[21px] font-semibold tracking-[-0.01em]">
            Prospects
          </div>
          <p className="mt-2 text-sm text-[#6e6e73]">
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
