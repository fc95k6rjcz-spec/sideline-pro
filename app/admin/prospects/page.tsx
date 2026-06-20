import ProspectsClient from "./ProspectsClient";

export default function ProspectsPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Sales pipeline</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Prospects</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Live spreadsheet of every potential club. Click any cell to edit; changes
        save instantly. Track outreach status, who&apos;s assigned, and what the next
        action is.
      </p>

      <ProspectsClient />
    </div>
  );
}
