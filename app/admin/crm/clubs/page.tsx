"use client";

import { useMemo, useState } from "react";
import { useCrm } from "../_components/CrmProvider";
import { ClubFilters, ClubTable, EMPTY_FILTER, applyClubFilter, type ClubFilter } from "../_components/ClubBoard";
import { AddClub } from "../_components/AddClub";
import { cx, inputClass } from "../_components/ui";

export default function AllClubsPage() {
  const { snap, views } = useCrm();
  const [f, setF] = useState<ClubFilter>(EMPTY_FILTER);
  const [assoc, setAssoc] = useState("");
  const all = useMemo(() => [...views.values()], [views]);
  const shown = useMemo(() => {
    const byAssoc = assoc === "" ? all : assoc === "none" ? all.filter((v) => !v.associations.length) : all.filter((v) => v.associations.some((a) => a.id === assoc));
    return applyClubFilter(byAssoc, f);
  }, [all, f, assoc]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">All clubs</h1>
          <p className="mt-1 text-sm text-[#6e6e73]">Every club across associations. Sort by any column; click a row for the club panel.</p>
        </div>
        <AddClub associationId={null} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select className={cx(inputClass, "w-auto")} value={assoc} onChange={(e) => setAssoc(e.target.value)}>
          <option value="">All associations</option>
          {snap?.associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          <option value="none">No association yet</option>
        </select>
        <div className="flex-1"><ClubFilters f={f} set={setF} count={shown.length} total={all.length} /></div>
      </div>
      <ClubTable views={shown} />
    </div>
  );
}
