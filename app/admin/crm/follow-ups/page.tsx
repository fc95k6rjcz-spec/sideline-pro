"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/crm/client";
import { fmtDate, followUpState } from "@/lib/crm/derive";
import { useCrm } from "../_components/CrmProvider";
import { Card, Empty, StageChip, cx, followClass, inputClass } from "../_components/ui";

// Every open next step across all clubs, soonest first, plus the clubs that
// have gone quiet: contacted with no reply and nothing scheduled.
export default function FollowUpsPage() {
  const { snap, ix, views, reload, openClub, today } = useCrm();
  const [owner, setOwner] = useState("");

  const tasks = useMemo(() => {
    if (!snap) return [];
    return snap.tasks
      .filter((t) => t.status === "open" && (!owner || t.owner === owner))
      .sort((a, b) => ((a.due_on ?? "9999") < (b.due_on ?? "9999") ? -1 : 1));
  }, [snap, owner]);

  const quiet = useMemo(
    () => [...views.values()].filter((v) => v.awaitingReply && !v.nextTask && (!owner || v.club.owner === owner)),
    [views, owner],
  );

  async function done(id: string) {
    await api.update("tasks", id, { status: "done" });
    await reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">Follow-ups</h1>
          <p className="mt-1 text-sm text-[#6e6e73]">Open next steps across every club, soonest first.</p>
        </div>
        <select className={cx(inputClass, "w-auto")} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Everyone</option>
          <option value="Justin">Justin</option>
          <option value="Rowan">Rowan</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {tasks.length === 0 ? <Empty>No open follow-ups.</Empty> : (
          <table className="w-full text-sm">
            <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
              <tr><th className="w-8 px-3 py-2" /><th className="px-3 py-2 text-left">Due</th><th className="px-3 py-2 text-left">Next step</th><th className="px-3 py-2 text-left">Club</th><th className="px-3 py-2 text-left">Who</th><th className="px-3 py-2 text-left">Owner</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const club = ix?.clubById.get(t.club_id);
                const person = t.person_id ? ix?.personById.get(t.person_id) : null;
                const st = followUpState(t.due_on, today);
                return (
                  <tr key={t.id} className="border-t border-black/5 hover:bg-[#fafafa]">
                    <td className="px-3 py-2"><input type="checkbox" title="Mark done" onChange={() => done(t.id)} /></td>
                    <td className={cx("whitespace-nowrap px-3 py-2", followClass(st))}>{t.due_on ? fmtDate(t.due_on) : "No date"}{st === "overdue" ? " · overdue" : ""}</td>
                    <td className="px-3 py-2">{t.title}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="font-semibold hover:text-gold" onClick={() => club && openClub(club.id)}>{club?.name ?? "—"}</button>
                      {club ? <span className="ml-2"><StageChip stage={club.stage} /></span> : null}
                    </td>
                    <td className="px-3 py-2 text-[#6e6e73]">{person?.full_name ?? ""}</td>
                    <td className="px-3 py-2 text-[#6e6e73]">{t.owner ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Gone quiet — contacted, no reply, nothing scheduled ({quiet.length})</h2>
        <Card className="divide-y divide-black/5">
          {quiet.length === 0 ? <Empty>Nothing has gone quiet.</Empty> : quiet.map((v) => (
            <button key={v.club.id} type="button" onClick={() => openClub(v.club.id)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[#fafafa]">
              <span className="font-semibold">{v.club.name}</span>
              <span className="text-xs text-[#9A6A1A]">Last outreach {fmtDate(v.lastOutboundAt)}</span>
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}
