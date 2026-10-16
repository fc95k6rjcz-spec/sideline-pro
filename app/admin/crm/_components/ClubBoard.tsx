"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, Star, Users } from "lucide-react";
import { PRIORITY_ROLES, ROLES, STAGES, stageDef } from "@/lib/crm/constants";
import { fmtDate, type ClubView } from "@/lib/crm/derive";
import { toCsv } from "@/lib/crm/tabular";
import { downloadText } from "@/lib/crm/client";
import { useCrm } from "./CrmProvider";
import { Btn, Card, Chip, Empty, RoleDots, StageChip, cx, followClass, inputClass } from "./ui";

// ---------- filters shared by board and table ----------

export type ClubFilter = {
  q: string;
  stage: string;
  missingRole: string; // "" | "any" | role key
  flag: "" | "needs_research" | "follow_up" | "awaiting_reply" | "not_contacted" | "stale" | "champion" | "general_only";
  owner: string;
};

export const EMPTY_FILTER: ClubFilter = { q: "", stage: "", missingRole: "", flag: "", owner: "" };

export function applyClubFilter(views: ClubView[], f: ClubFilter): ClubView[] {
  const q = f.q.trim().toLowerCase();
  return views.filter((v) => {
    const c = v.club;
    if (q) {
      const hay = [c.name, ...c.aliases, c.suburb, c.region, c.notes, ...v.associations.map((a) => a.name)].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.stage && c.stage !== f.stage) return false;
    if (f.owner && (c.owner ?? "") !== f.owner) return false;
    if (f.missingRole === "any" && v.missingPriority.length === 0) return false;
    if (f.missingRole && f.missingRole !== "any" && !v.missingPriority.includes(f.missingRole)) return false;
    switch (f.flag) {
      case "needs_research": return v.needsResearch;
      case "follow_up": return v.followUp === "overdue" || v.followUp === "today" || v.followUp === "soon";
      case "awaiting_reply": return v.awaitingReply;
      case "not_contacted": return !v.lastContactAt && stageDef(c.stage).open;
      case "stale": return v.staleCount > 0;
      case "champion": return !!v.champion;
      case "general_only": return v.hasGeneralEmailOnly;
      default: return true;
    }
  });
}

export function ClubFilters({ f, set, count, total }: { f: ClubFilter; set: (f: ClubFilter) => void; count: number; total: number }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#a1a1a6]" />
        <input className={cx(inputClass, "pl-8")} placeholder="Club, suburb, association, notes…" value={f.q} onChange={(e) => set({ ...f, q: e.target.value })} />
      </div>
      <select className={cx(inputClass, "w-auto")} value={f.stage} onChange={(e) => set({ ...f, stage: e.target.value })}>
        <option value="">All stages</option>
        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <select className={cx(inputClass, "w-auto")} value={f.flag} onChange={(e) => set({ ...f, flag: e.target.value as ClubFilter["flag"] })}>
        <option value="">Everything</option>
        <option value="needs_research">Needs research</option>
        <option value="follow_up">Follow-up due (7 days)</option>
        <option value="awaiting_reply">Contacted — no reply yet</option>
        <option value="not_contacted">Not contacted</option>
        <option value="stale">Committee info to re-check</option>
        <option value="champion">Has a champion</option>
        <option value="general_only">Only a general email</option>
      </select>
      <select className={cx(inputClass, "w-auto")} value={f.missingRole} onChange={(e) => set({ ...f, missingRole: e.target.value })}>
        <option value="">Any roles</option>
        <option value="any">Missing a priority role</option>
        {PRIORITY_ROLES.map((r) => <option key={r.key} value={r.key}>Missing {r.label.toLowerCase()}</option>)}
      </select>
      <select className={cx(inputClass, "w-auto")} value={f.owner} onChange={(e) => set({ ...f, owner: e.target.value })}>
        <option value="">Any owner</option>
        <option value="Justin">Justin</option>
        <option value="Rowan">Rowan</option>
      </select>
      <span className="pb-1.5 text-xs text-[#86868b]">{count === total ? `${total} clubs` : `${count} of ${total} clubs`}</span>
    </div>
  );
}

// ---------- card ----------

export function ClubCard({ v, onOpen }: { v: ClubView; onOpen: () => void }) {
  const c = v.club;
  const s = stageDef(c.stage);
  const notContacted = !v.lastContactAt;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "group flex w-full flex-col gap-2 rounded-xl border border-black/10 border-l-4 bg-white p-3 text-left transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        s.bar,
        !s.open && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-tight text-[#1d1d1f] group-hover:text-gold-dark">{c.name}</div>
          <div className="truncate text-[11px] text-[#86868b]">{[c.suburb, c.region].filter(Boolean).join(" · ") || "Suburb not recorded"}</div>
        </div>
        {v.champion ? (
          <Star className={cx("h-4 w-4 shrink-0", v.champion === "confirmed" ? "fill-gold text-gold" : "text-gold")} aria-label={`${v.champion} champion`} />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StageChip stage={c.stage} />
        {v.needsResearch && c.stage !== "needs_research" ? <Chip className="bg-[#F0F0F2] text-[#6E6E73]">Research gaps</Chip> : null}
        {v.staleCount ? (
          <Chip className="bg-[#FDF1E0] text-[#9A6A1A]" title="Committee details checked before this AGM season">
            <AlertTriangle className="h-3 w-3" />
            {v.staleCount} to re-check
          </Chip>
        ) : null}
      </div>
      <RoleDots found={v.rolesFound} />
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        <span className="flex items-center gap-1 text-[#6e6e73]">
          <Users className="h-3 w-3" /> {v.contactCount} contact{v.contactCount === 1 ? "" : "s"}
        </span>
        <span className="truncate text-right text-[#6e6e73]">{c.owner ?? ""}</span>
        <span className={cx(notContacted ? "text-[#86868b]" : v.awaitingReply ? "text-[#9A6A1A]" : "text-[#3a3a3c]")}>
          {notContacted ? "Not contacted" : v.awaitingReply ? `Awaiting reply · ${fmtDate(v.lastOutboundAt)}` : `Last ${fmtDate(v.lastContactAt)}`}
        </span>
        <span className={cx("truncate text-right", followClass(v.followUp))} title={v.nextTask?.title}>
          {v.nextTask ? `Next ${fmtDate(v.nextTask.due_on)}` : "No next step"}
        </span>
      </div>
    </button>
  );
}

// ---------- board ----------

type GroupBy = "stage" | "suburb" | "followup" | "none";

export function ClubBoard({ views }: { views: ClubView[] }) {
  const { openClub } = useCrm();
  const [group, setGroup] = useState<GroupBy>("stage");

  const groups = useMemo(() => {
    const sorted = [...views].sort((a, b) => a.club.name.localeCompare(b.club.name));
    if (group === "none") return [{ key: "all", label: "All clubs", items: sorted }];
    if (group === "stage") {
      return STAGES.map((s) => ({ key: s.key, label: s.label, items: sorted.filter((v) => v.club.stage === s.key) })).filter((g) => g.items.length);
    }
    if (group === "followup") {
      const order: [string, string, (v: ClubView) => boolean][] = [
        ["overdue", "Overdue", (v) => v.followUp === "overdue"],
        ["today", "Due today", (v) => v.followUp === "today"],
        ["soon", "This week", (v) => v.followUp === "soon"],
        ["later", "Later", (v) => v.followUp === "later"],
        ["none", "No next step", (v) => v.followUp === "none"],
      ];
      return order.map(([key, label, fn]) => ({ key, label, items: sorted.filter(fn) })).filter((g) => g.items.length);
    }
    const by = new Map<string, ClubView[]>();
    for (const v of sorted) {
      const k = v.club.suburb || v.club.region || "Suburb not recorded";
      by.set(k, [...(by.get(k) ?? []), v]);
    }
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, items]) => ({ key: k, label: k, items }));
  }, [views, group]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs">
          <span className="mr-1 text-[#86868b]">Group by</span>
          {([["stage", "Stage"], ["followup", "Follow-up"], ["suburb", "Suburb"], ["none", "A–Z"]] as [GroupBy, string][]).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setGroup(k)}
              className={cx("rounded-md px-2 py-1 font-semibold", group === k ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73] hover:text-gold")}>
              {l}
            </button>
          ))}
        </div>
        <Legend />
      </div>
      {views.length === 0 ? (
        <Card><Empty>No clubs match.</Empty></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            // One row per group, label on the left and clubs flowing right —
            // the LEX stack plan, with stages in place of floors.
            <div key={g.key} className="grid grid-cols-1 gap-2 rounded-2xl border border-black/5 bg-[#fafafa] p-2 md:grid-cols-[132px_1fr]">
              <div className="flex items-center gap-2 px-1 md:sticky md:top-20 md:flex-col md:items-end md:self-start md:pt-3 md:text-right">
                <span className="text-[12px] font-semibold text-[#3a3a3c]">{g.label}</span>
                <span className="text-[11px] text-[#86868b]">{g.items.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((v) => <ClubCard key={v.club.id} v={v} onOpen={() => openClub(v.club.id)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#86868b]">
      {PRIORITY_ROLES.map((r) => (
        <span key={r.key}><b className="text-[#3a3a3c]">{r.short}</b> {r.label.split(" /")[0]}</span>
      ))}
      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" /> champion</span>
    </div>
  );
}

// ---------- table ----------

type SortKey = "name" | "stage" | "contacts" | "missing" | "last" | "next";

export function ClubTable({ views, showAssociation = true }: { views: ClubView[]; showAssociation?: boolean }) {
  const { openClub } = useCrm();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const stageIdx = (k: string) => STAGES.findIndex((s) => s.key === k);
  const rows = useMemo(() => {
    const val = (v: ClubView): string | number => {
      switch (sort.key) {
        case "stage": return stageIdx(v.club.stage);
        case "contacts": return v.contactCount;
        case "missing": return v.missingPriority.length;
        case "last": return v.lastContactAt ?? "";
        case "next": return v.nextTask?.due_on ?? "9999";
        default: return v.club.name.toLowerCase();
      }
    };
    return [...views].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [views, sort]);

  const th = (key: SortKey, label: string) => (
    <th className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-semibold hover:text-[#1d1d1f]"
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  function exportCsv() {
    const header = ["Club", "Associations", "Suburb", "Region", "Stage", "Owner", "Contacts", "Missing priority roles", "Last contact", "Awaiting reply", "Next action", "Next due", "Website", "Champion"];
    const body = rows.map((v) => [
      v.club.name, v.associations.map((a) => a.short_name || a.name).join("; "), v.club.suburb ?? "", v.club.region ?? "",
      stageDef(v.club.stage).label, v.club.owner ?? "", v.contactCount,
      v.missingPriority.map((k) => ROLES.find((r) => r.key === k)?.label ?? k).join("; "),
      v.lastContactAt?.slice(0, 10) ?? "", v.awaitingReply ? "Yes" : "", v.nextTask?.title ?? "", v.nextTask?.due_on ?? "",
      v.club.website ?? "", v.champion ?? "",
    ]);
    downloadText(`sidelinepro-clubs-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...body]));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-end border-b border-black/5 px-3 py-2">
        <Btn small onClick={exportCsv}>Export {rows.length} to CSV</Btn>
      </div>
      {rows.length === 0 ? <Empty>No clubs match.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
              <tr>
                {th("name", "Club")}
                {showAssociation ? <th className="px-3 py-2 text-left font-semibold">Association</th> : null}
                {th("stage", "Stage")}
                {th("contacts", "Contacts")}
                {th("missing", "Key roles")}
                {th("last", "Last contact")}
                {th("next", "Next action")}
                <th className="px-3 py-2 text-left font-semibold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.club.id} onClick={() => openClub(v.club.id)} className="cursor-pointer border-t border-black/5 align-top hover:bg-[#fafafa]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1d1d1f]">
                      {v.club.name}
                      {v.champion ? <Star className={cx("h-3 w-3", v.champion === "confirmed" ? "fill-gold text-gold" : "text-gold")} /> : null}
                    </div>
                    <div className="text-[11px] text-[#86868b]">{v.club.suburb ?? v.club.region ?? ""}</div>
                  </td>
                  {showAssociation ? (
                    <td className="px-3 py-2 text-[#6e6e73]">{v.associations.map((a) => a.short_name || a.name).join(", ") || <span className="text-[#C8332B]">None</span>}</td>
                  ) : null}
                  <td className="px-3 py-2"><StageChip stage={v.club.stage} /></td>
                  <td className="px-3 py-2">{v.contactCount}</td>
                  <td className="px-3 py-2"><RoleDots found={v.rolesFound} /></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {!v.lastContactAt ? <span className="text-[#86868b]">Not contacted</span> : v.awaitingReply ? <span className="text-[#9A6A1A]">No reply · {fmtDate(v.lastOutboundAt)}</span> : fmtDate(v.lastContactAt)}
                  </td>
                  <td className="px-3 py-2">
                    {v.nextTask ? (
                      <>
                        <div className={followClass(v.followUp)}>{fmtDate(v.nextTask.due_on)}</div>
                        <div className="max-w-[220px] truncate text-[11px] text-[#6e6e73]">{v.nextTask.title}</div>
                      </>
                    ) : <span className="text-[#86868b]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[#6e6e73]">{v.club.owner ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
