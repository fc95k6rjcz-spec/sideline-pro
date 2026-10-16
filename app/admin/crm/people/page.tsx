"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { BACKGROUND_TAGS, PRIORITY_ROLES, ROLES, STAGES, roleLabel, stageDef } from "@/lib/crm/constants";
import { downloadText } from "@/lib/crm/client";
import { fmtDate, isLiveAppointment, isStale } from "@/lib/crm/derive";
import { roleMatchesQuery } from "@/lib/crm/roles";
import { toCsv } from "@/lib/crm/tabular";
import type { Appointment, ContactPoint } from "@/lib/crm/types";
import { useCrm } from "../_components/CrmProvider";
import { Btn, Card, Chip, Empty, StageChip, VerifChip, cx, inputClass } from "../_components/ui";

type Row = {
  a: Appointment;
  name: string;
  clubName: string;
  assocNames: string;
  emails: ContactPoint[];
  phones: ContactPoint[];
  stale: boolean;
};

export default function PeoplePage() {
  const { snap, ix, views, openPerson, openClub, today } = useCrm();
  const [q, setQ] = useState("");
  const [roleQ, setRoleQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"live" | "former" | "all">("live");
  const [assoc, setAssoc] = useState("");
  const [stage, setStage] = useState("");
  const [contact, setContact] = useState<"" | "email" | "no_email" | "verified_email">("");
  const [bg, setBg] = useState("");
  const [champ, setChamp] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);

  const rows = useMemo<Row[]>(() => {
    if (!snap || !ix) return [];
    const out: Row[] = [];
    for (const a of snap.appointments) {
      if (status === "live" && !isLiveAppointment(a)) continue;
      if (status === "former" && a.status !== "former") continue;
      if (a.status === "vacant") continue;
      if (role && a.role_category !== role) continue;
      if (roleQ && !roleMatchesQuery(roleQ, a)) continue;
      const club = ix.clubById.get(a.club_id);
      const p = a.person_id ? ix.personById.get(a.person_id) : undefined;
      if (!club || !p) continue;
      const v = views.get(club.id);
      if (assoc && !(assoc === "none" ? !v?.associations.length : v?.associations.some((x) => x.id === assoc))) continue;
      if (stage && club.stage !== stage) continue;
      if (bg && !(p.background_tags.includes(bg) && p.professional_verified_on)) continue;
      if (champ && p.champion_status === "none" && !a.purchase_roles.includes("champion")) continue;
      const own = (ix.cpsByPerson.get(p.id) ?? []).filter((c) => c.status === "active");
      const roleInbox = (ix.cpsByClub.get(club.id) ?? []).filter((c) => c.inbox_type === "role" && c.role_category === a.role_category && c.status === "active" && c.kind === "email");
      const emails = [...roleInbox, ...own.filter((c) => c.kind === "email" && c.inbox_type !== "work")].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
      const phones = own.filter((c) => c.kind === "phone");
      if (contact === "email" && !emails.length) continue;
      if (contact === "no_email" && emails.length) continue;
      if (contact === "verified_email" && !emails.some((e) => e.verification === "verified")) continue;
      const stale = a.status !== "former" && isStale(a.verified_on, today);
      if (staleOnly && !stale) continue;
      if (q) {
        const hay = `${p.full_name} ${club.name} ${a.original_title ?? ""} ${emails.map((e) => e.value).join(" ")} ${p.employer ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) continue;
      }
      out.push({
        a,
        name: p.full_name,
        clubName: club.name,
        assocNames: (v?.associations ?? []).map((x) => x.short_name || x.name).join(", "),
        emails,
        phones,
        stale,
      });
    }
    return out.sort((x, y) => x.clubName.localeCompare(y.clubName) || ROLES.findIndex((r) => r.key === x.a.role_category) - ROLES.findIndex((r) => r.key === y.a.role_category));
  }, [snap, ix, views, q, roleQ, role, status, assoc, stage, contact, bg, champ, staleOnly, today]);

  // Clubs in the current association/stage scope with nobody in the chosen role.
  const gaps = useMemo(() => {
    if (!role || !PRIORITY_ROLES.some((r) => r.key === role)) return [];
    return [...views.values()].filter((v) => {
      if (assoc && !(assoc === "none" ? !v.associations.length : v.associations.some((x) => x.id === assoc))) return false;
      if (stage && v.club.stage !== stage) return false;
      return v.missingPriority.includes(role);
    });
  }, [views, role, assoc, stage]);

  function exportCsv() {
    const header = ["Name", "Role", "Club's title", "Status", "Club", "Association(s)", "Stage", "Email(s)", "Phone(s)", "Verification", "Last checked", "Needs re-check", "Source"];
    const body = rows.map((r) => [
      r.name, roleLabel(r.a.role_category), r.a.original_title ?? "", r.a.status, r.clubName, r.assocNames,
      stageDef(ix?.clubById.get(r.a.club_id)?.stage).label, r.emails.map((e) => e.value).join("; "), r.phones.map((e) => e.value).join("; "),
      r.a.verification, r.a.verified_on ?? "", r.stale ? "Yes" : "", r.a.source_url ?? r.a.source_note ?? "",
    ]);
    downloadText(`sidelinepro-people-${today}.csv`, toCsv([header, ...body]));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">People & roles</h1>
          <p className="mt-1 text-sm text-[#6e6e73]">Every committee appointment across all clubs. Role search understands variations, so “umpire coordinator” finds convenors too.</p>
        </div>
        <Btn onClick={exportCsv}>Export {rows.length} to CSV</Btn>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#a1a1a6]" />
          <input className={cx(inputClass, "pl-8")} placeholder="Name, club, email, employer…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input className={cx(inputClass, "w-52")} placeholder="Role search, e.g. umpire coordinator" value={roleQ} onChange={(e) => setRoleQ(e.target.value)} />
        <select className={cx(inputClass, "w-auto")} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Any role</option>
          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select className={cx(inputClass, "w-auto")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="live">Current</option><option value="former">Former</option><option value="all">Current + former</option>
        </select>
        <select className={cx(inputClass, "w-auto")} value={assoc} onChange={(e) => setAssoc(e.target.value)}>
          <option value="">All associations</option>
          {snap?.associations.map((a) => <option key={a.id} value={a.id}>{a.short_name || a.name}</option>)}
          <option value="none">No association</option>
        </select>
        <select className={cx(inputClass, "w-auto")} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">Any stage</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className={cx(inputClass, "w-auto")} value={contact} onChange={(e) => setContact(e.target.value as typeof contact)}>
          <option value="">Any contact info</option><option value="email">Has email</option><option value="verified_email">Verified email</option><option value="no_email">No email yet</option>
        </select>
        <select className={cx(inputClass, "w-auto")} value={bg} onChange={(e) => setBg(e.target.value)}>
          <option value="">Any background</option>
          {BACKGROUND_TAGS.map((b) => <option key={b.key} value={b.key}>{b.label} (confirmed)</option>)}
        </select>
        <label className="flex items-center gap-1 pb-1.5 text-xs"><input type="checkbox" checked={champ} onChange={(e) => setChamp(e.target.checked)} /> Champions</label>
        <label className="flex items-center gap-1 pb-1.5 text-xs"><input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} /> To re-check</label>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? <Empty>No one matches.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs">
              <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
                <tr>
                  <th className="px-3 py-2 text-left">Person</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-left">Club</th>
                  <th className="px-3 py-2 text-left">Contact</th><th className="px-3 py-2 text-left">Checked</th><th className="px-3 py-2 text-left">Buying role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = ix?.personById.get(r.a.person_id!);
                  const club = ix?.clubById.get(r.a.club_id);
                  return (
                    <tr key={r.a.id} className={cx("border-t border-black/5 align-top hover:bg-[#fafafa]", r.a.status === "former" && "opacity-60")}>
                      <td className="px-3 py-2">
                        <button type="button" className="flex items-center gap-1 font-semibold hover:text-gold" onClick={() => openPerson(r.a.person_id!)}>
                          {r.name}
                          {p && p.champion_status !== "none" ? <Star className={cx("h-3 w-3", p.champion_status === "confirmed" ? "fill-gold text-gold" : "text-gold")} /> : null}
                        </button>
                        {p?.job_title && p.professional_verified_on ? <div className="text-[11px] text-[#86868b]">{p.job_title}{p.employer ? `, ${p.employer}` : ""}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold">{roleLabel(r.a.role_category)}</div>
                        {r.a.original_title && r.a.original_title !== roleLabel(r.a.role_category) ? <div className="text-[11px] text-[#86868b]">“{r.a.original_title}”</div> : null}
                        {r.a.status !== "current" ? <Chip className="mt-0.5 bg-[#F0F0F2] text-[#6E6E73]">{r.a.status === "unverified" ? "unconfirmed" : r.a.status}</Chip> : null}
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" className="font-semibold hover:text-gold" onClick={() => openClub(r.a.club_id)}>{r.clubName}</button>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#86868b]">{r.assocNames}{club ? <StageChip stage={club.stage} /> : null}</div>
                      </td>
                      <td className="px-3 py-2">
                        {r.emails.length || r.phones.length ? (
                          <div className="space-y-0.5">
                            {r.emails.map((e) => <div key={e.id}><a className="text-[#2D5DA8] hover:underline" href={`mailto:${e.value}`}>{e.value}</a>{e.inbox_type === "role" ? <span className="text-[#86868b]"> (role inbox)</span> : null}</div>)}
                            {r.phones.map((e) => <div key={e.id} className="text-[#6e6e73]">{e.value}</div>)}
                          </div>
                        ) : <span className="text-[#C8332B]">No contact details</span>}
                      </td>
                      <td className="px-3 py-2"><VerifChip v={r.a.verification} verifiedOn={r.a.verified_on} stale={r.stale} /><div className="mt-0.5 text-[11px] text-[#86868b]">{fmtDate(r.a.verified_on)}</div></td>
                      <td className="px-3 py-2 text-[11px] text-[#6e6e73]">{r.a.purchase_roles.map((x) => x.replace(/_/g, " ")).join(", ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {gaps.length ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Clubs with no {roleLabel(role).toLowerCase()} found ({gaps.length})</h2>
          <Card className="flex flex-wrap gap-2 p-3">
            {gaps.map((v) => (
              <button key={v.club.id} type="button" onClick={() => openClub(v.club.id)} className="rounded-full border border-black/10 px-3 py-1 text-xs hover:border-gold hover:text-gold">{v.club.name}</button>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
