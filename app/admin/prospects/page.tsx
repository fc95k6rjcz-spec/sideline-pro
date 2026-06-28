import ProspectsClient from "./ProspectsClient";

export default function ProspectsPage() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
        Sales pipeline
      </p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.015em]">
        Prospects
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[#6e6e73]">
        Live spreadsheet of every potential club. Click any cell to edit; changes
        save instantly. Track outreach status, who&apos;s assigned, and what the next
        action is.
      </p>

      <ProspectsClient />
    </div>
  );
}
