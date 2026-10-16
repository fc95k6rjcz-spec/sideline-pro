"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { associationCoverage, fmtDate } from "@/lib/crm/derive";
import { hrefFor } from "@/lib/crm/normalise";
import { useCrm } from "../../_components/CrmProvider";
import { ClubBoard, ClubFilters, ClubTable, EMPTY_FILTER, applyClubFilter, type ClubFilter } from "../../_components/ClubBoard";
import { AddClub } from "../../_components/AddClub";
import { Card, ExtLink, Stat, cx } from "../../_components/ui";

export default function AssociationPage() {
  const { id } = useParams<{ id: string }>();
  const { snap, ix, views, loading } = useCrm();
  const [mode, setMode] = useState<"board" | "table">("board");
  const [f, setF] = useState<ClubFilter>(EMPTY_FILTER);

  const unassigned = id === "unassigned";
  const assoc = snap?.associations.find((a) => a.id === id) ?? null;
  const clubViews = useMemo(() => {
    if (!ix) return [];
    if (unassigned) return [...views.values()].filter((v) => v.associations.length === 0);
    return (ix.clubIdsByAssoc.get(id) ?? []).map((cid) => views.get(cid)!).filter(Boolean);
  }, [ix, views, id, unassigned]);
  const shown = useMemo(() => applyClubFilter(clubViews, f), [clubViews, f]);
  const cov = associationCoverage(assoc, clubViews);

  if (loading && !snap) return <Card className="p-8 text-center text-sm text-[#86868b]">Loading…</Card>;
  if (!unassigned && !assoc) return <Card className="p-8 text-center text-sm text-[#86868b]">Association not found. <Link href="/admin/crm" className="text-gold">Back</Link></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/crm" className="text-xs text-[#86868b] hover:text-gold">← Associations</Link>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.015em]">{assoc?.name ?? "Clubs not yet linked to an association"}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6e6e73]">
            {assoc ? <span>{[assoc.short_name, assoc.region, assoc.state].filter(Boolean).join(" · ")}</span> : <span>Open a club to link it to its association.</span>}
            {assoc?.website ? <ExtLink href={hrefFor(assoc.website)}>{assoc.website}</ExtLink> : null}
            {assoc ? (
              <span title={assoc.source_note ?? undefined}>
                Source: {assoc.source_url ? <ExtLink href={hrefFor(assoc.source_url)}>{assoc.source_url}</ExtLink> : assoc.source_note ?? "not recorded"}
                {assoc.verified_on ? ` · checked ${fmtDate(assoc.verified_on)}` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <AddClub associationId={assoc?.id ?? null} />
      </div>

      <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
        <Stat label="Clubs" value={cov.clubCount} />
        <Stat label="Priority roles found" value={`${Math.round(cov.coverage * 100)}%`} />
        <Stat label="Fully mapped" value={cov.fullyMapped} />
        <Stat label="Needs research" value={cov.needsResearch} />
        <Stat label="Follow-ups due" value={cov.followUpsDue} tone={cov.followUpsDue ? "red" : undefined} />
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <ClubFilters f={f} set={setF} count={shown.length} total={clubViews.length} />
        <div className="flex rounded-md border border-black/10 p-0.5">
          {([["board", "Board", LayoutGrid], ["table", "Table", Table2]] as const).map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setMode(k)}
              className={cx("flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold", mode === k ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]")}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>
      </div>

      {mode === "board" ? <ClubBoard views={shown} /> : <ClubTable views={shown} showAssociation={unassigned} />}
    </div>
  );
}
