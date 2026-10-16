"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Star, X } from "lucide-react";
import { FEATURES, OWNERS, PRIORITY_ROLES, STAGES, stageDef } from "@/lib/crm/constants";
import { api } from "@/lib/crm/client";
import { fmtDate, followUpState, isStale } from "@/lib/crm/derive";
import { hrefFor, todayISO } from "@/lib/crm/normalise";
import type { Activity, Club, Task, Verification } from "@/lib/crm/types";
import { useCrm } from "./CrmProvider";
import { CommitteeTab } from "./CommitteeTab";
import { ActivityTab } from "./ActivityTab";
import { Btn, Chip, ChipToggle, ErrorBox, ExtLink, Field, SectionTitle, Tabs, VerifChip, cx, followClass, inputClass } from "./ui";

type Detail = {
  activities: Activity[];
  tasks: Task[];
  changeLog: { id: number; entity: string; action: string; changes: Record<string, unknown>; source_url: string | null; source_note: string | null; actor_email: string | null; at: string }[];
  proposals: { id: string; title: string; status: string; sent_at: string | null; accepted_at: string | null; token: string }[];
};

type TabKey = "summary" | "committee" | "activity" | "details" | "history";

export default function ClubPanel() {
  const { clubId, openClub, views, snap, reload, version } = useCrm();
  const v = clubId ? views.get(clubId) : undefined;
  const [tab, setTab] = useState<TabKey>("summary");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!clubId) return;
    try {
      setDetail(await api.clubDetail<Detail>(clubId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load club");
    }
  }, [clubId]);

  useEffect(() => {
    setDetail(null);
    setErr(null);
    loadDetail();
  }, [loadDetail, version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openClub(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openClub]);

  if (!clubId) return null;

  /** Run a write, then refresh the snapshot (which also refreshes this panel). */
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/20" onClick={() => openClub(null)} />
      <aside className="relative flex h-full w-full max-w-[760px] flex-col overflow-hidden bg-white shadow-[0_0_60px_rgba(0,0,0,0.18)]">
        {!v ? (
          <div className="p-8 text-sm text-[#86868b]">{snap ? "Club not found." : "Loading…"}</div>
        ) : (
          <>
            <Header club={v.club} run={run} />
            <div className="px-5">
              <Tabs<TabKey>
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "summary", label: "Summary" },
                  { key: "committee", label: `Committee & contacts (${v.contactCount})` },
                  { key: "activity", label: `Activity (${detail?.activities.filter((a) => a.kind !== "stage_change").length ?? "…"})` },
                  { key: "details", label: "Club details" },
                  { key: "history", label: "Sources & history" },
                ]}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ErrorBox>{err}</ErrorBox>
              {tab === "summary" && <SummaryTab clubId={v.club.id} detail={detail} run={run} goCommittee={() => setTab("committee")} />}
              {tab === "committee" && <CommitteeTab clubId={v.club.id} run={run} />}
              {tab === "activity" && <ActivityTab clubId={v.club.id} activities={detail?.activities ?? null} run={run} />}
              {tab === "details" && <DetailsTab club={v.club} run={run} onDeleted={() => openClub(null)} />}
              {tab === "history" && <HistoryTab club={v.club} detail={detail} />}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// ---------- header ----------

function Header({ club, run }: { club: Club; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { openClub, views, snap } = useCrm();
  const v = views.get(club.id)!;
  const [adding, setAdding] = useState(false);
  const linkable = (snap?.associations ?? []).filter((a) => !v.associations.some((x) => x.id === a.id));
  const ca = snap?.clubAssociations.filter((x) => x.club_id === club.id) ?? [];
  return (
    <div className="border-b border-black/5 px-5 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[22px] font-semibold tracking-[-0.01em]">{club.name}</h2>
            {v.champion ? <Star className={cx("h-4 w-4", v.champion === "confirmed" ? "fill-gold text-gold" : "text-gold")} /> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6e6e73]">
            <span>{[club.suburb, club.region, club.state].filter(Boolean).join(" · ")}</span>
            {club.website ? <ExtLink href={hrefFor(club.website)}><span className="inline-flex items-center gap-1">{club.website} <ExternalLink className="h-3 w-3" /></span></ExtLink> : null}
            {Object.entries(club.social_links ?? {}).map(([k, url]) => (
              <ExtLink key={k} href={hrefFor(url)}><span className="capitalize">{k}</span></ExtLink>
            ))}
            {club.aliases.length ? <span>aka {club.aliases.join(", ")}</span> : null}
          </div>
        </div>
        <button type="button" onClick={() => openClub(null)} className="rounded-md p-1 text-[#86868b] hover:bg-[#f5f5f7]" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className={cx("rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none", stageDef(club.stage).chip)}
          value={club.stage}
          onChange={(e) => run(() => api.update("clubs", club.id, { stage: e.target.value }))}
        >
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select
          className="rounded-full border border-black/10 px-3 py-1 text-xs outline-none"
          value={club.owner ?? ""}
          onChange={(e) => run(() => api.update("clubs", club.id, { owner: e.target.value }))}
        >
          <option value="">No owner</option>
          {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {v.associations.map((a) => {
          const link = ca.find((x) => x.association_id === a.id);
          return (
            <Chip key={a.id} className="bg-[#f5f5f7] text-[#3a3a3c]" title={`${link?.verification ?? ""} · ${link?.source_note ?? link?.source_url ?? "no source"}`}>
              {a.short_name || a.name}
              {link?.verification !== "verified" ? <span className="text-[#9A6A1A]">?</span> : null}
              <button type="button" className="ml-0.5 text-[#86868b] hover:text-[#C8332B]" title="Unlink"
                onClick={() => confirm(`Remove ${club.name} from ${a.name}?`) && run(() => api.unlinkAssociation(club.id, a.id))}>×</button>
            </Chip>
          );
        })}
        {adding ? (
          <select autoFocus className="rounded-full border border-gold px-2 py-1 text-xs" defaultValue=""
            onBlur={() => setAdding(false)}
            onChange={(e) => {
              if (e.target.value) run(() => api.linkAssociation({ club_id: club.id, association_id: e.target.value }));
              setAdding(false);
            }}>
            <option value="" disabled>Link to association…</option>
            {linkable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        ) : linkable.length ? (
          <button type="button" onClick={() => setAdding(true)} className="rounded-full border border-dashed border-black/20 px-2 py-0.5 text-[11px] text-[#86868b] hover:border-gold hover:text-gold">+ association</button>
        ) : null}
      </div>
    </div>
  );
}

// ---------- summary ----------

function SummaryTab({ clubId, detail, run, goCommittee }: { clubId: string; detail: Detail | null; run: (fn: () => Promise<unknown>) => Promise<void>; goCommittee: () => void }) {
  const { views, ix, today } = useCrm();
  const v = views.get(clubId)!;
  const c = v.club;
  const open = (ix?.tasksByClub.get(clubId) ?? []).slice().sort((a, b) => ((a.due_on ?? "9999") < (b.due_on ?? "9999") ? -1 : 1));
  const done = (detail?.tasks ?? []).filter((t) => t.status === "done").slice(0, 5);
  const [task, setTask] = useState({ title: "", due_on: "", owner: c.owner ?? "" });
  const [pipe, setPipe] = useState({ pain_points: c.pain_points ?? "", delay_reason: c.delay_reason ?? "", loss_reason: c.loss_reason ?? "", demo_on: c.demo_on ?? "", proposal_status: c.proposal_status ?? "" });
  useEffect(() => {
    setPipe({ pain_points: c.pain_points ?? "", delay_reason: c.delay_reason ?? "", loss_reason: c.loss_reason ?? "", demo_on: c.demo_on ?? "", proposal_status: c.proposal_status ?? "" });
  }, [c.pain_points, c.delay_reason, c.loss_reason, c.demo_on, c.proposal_status]);
  const holders = (role: string) =>
    v.current.filter((a) => a.role_category === role).map((a) => ix?.personById.get(a.person_id!)?.full_name).filter(Boolean);
  const inboxFor = (role: string) =>
    (ix?.cpsByClub.get(clubId) ?? []).find((cp) => cp.inbox_type === "role" && cp.role_category === role && cp.kind === "email");

  return (
    <div className="space-y-6">
      {/* Where this club stands */}
      <div className="grid gap-3 rounded-xl bg-[#fafafa] p-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-[#86868b]">Last contact</div>
          <div className="mt-0.5 font-semibold">
            {!v.lastContactAt ? "Not contacted yet" : v.awaitingReply ? `Contacted ${fmtDate(v.lastOutboundAt)} — no reply yet` : fmtDate(v.lastContactAt)}
          </div>
        </div>
        <div>
          <div className="text-[#86868b]">Next step</div>
          <div className={cx("mt-0.5 font-semibold", followClass(v.followUp))}>{v.nextTask ? `${fmtDate(v.nextTask.due_on)} · ${v.nextTask.title}` : "Nothing scheduled"}</div>
        </div>
        <div>
          <div className="text-[#86868b]">Size</div>
          <div className="mt-0.5 font-semibold">{c.approx_players ?? "Players unknown"}{c.approx_teams ? ` · ${c.approx_teams} teams` : ""}</div>
        </div>
      </div>

      <section>
        <SectionTitle>Next steps</SectionTitle>
        <div className="space-y-1.5">
          {open.length === 0 ? <div className="text-xs text-[#86868b]">No open follow-ups.</div> : open.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-black/5 px-2.5 py-1.5 text-sm">
              <input type="checkbox" title="Done" onChange={() => run(() => api.update("tasks", t.id, { status: "done" }))} />
              <span className={cx("w-20 shrink-0 text-xs", followClass(followUpState(t.due_on, today)))}>{t.due_on ? fmtDate(t.due_on) : "No date"}</span>
              <span className="flex-1">{t.title}</span>
              <span className="text-xs text-[#86868b]">{t.owner}</span>
              <button type="button" className="text-xs text-[#86868b] hover:text-[#C8332B]" onClick={() => run(() => api.update("tasks", t.id, { status: "cancelled" }))}>Cancel</button>
            </div>
          ))}
        </div>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!task.title.trim()) return;
            run(() => api.create("tasks", { club_id: clubId, ...task })).then(() => setTask({ title: "", due_on: "", owner: task.owner }));
          }}
        >
          <input className={cx(inputClass, "min-w-[200px] flex-1")} placeholder="Next action, e.g. Call the treasurer" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
          <input type="date" className={cx(inputClass, "w-auto")} value={task.due_on} onChange={(e) => setTask({ ...task, due_on: e.target.value })} />
          <select className={cx(inputClass, "w-auto")} value={task.owner} onChange={(e) => setTask({ ...task, owner: e.target.value })}>
            <option value="">Owner</option>
            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <Btn type="submit" kind="primary" disabled={!task.title.trim()}>Add</Btn>
        </form>
        {done.length ? (
          <details className="mt-2 text-xs text-[#86868b]">
            <summary className="cursor-pointer">Recently done ({done.length})</summary>
            <ul className="mt-1 space-y-0.5">{done.map((t) => <li key={t.id}>✓ {t.title} {t.completed_at ? `· ${fmtDate(t.completed_at)}` : ""}</li>)}</ul>
          </details>
        ) : null}
      </section>

      <section>
        <SectionTitle right={<Btn small kind="ghost" onClick={goCommittee}>Committee →</Btn>}>Priority contacts</SectionTitle>
        <div className="divide-y divide-black/5 rounded-xl border border-black/5">
          {PRIORITY_ROLES.map((r) => {
            const names = holders(r.key);
            const inbox = inboxFor(r.key);
            const found = names.length > 0 || !!inbox;
            return (
              <div key={r.key} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className={cx("mt-0.5 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded text-[9.5px] font-bold", found ? "bg-[#1d1d1f] text-white" : "border border-dashed border-black/25 text-[#a1a1a6]")}>{r.short}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{r.label}</span>
                    <span className={found ? "text-[#3a3a3c]" : "text-[#C8332B]"}>
                      {names.length ? names.join(", ") : inbox ? "Name unknown" : "Not found yet"}
                    </span>
                    {inbox ? <span className="text-xs text-[#6e6e73]">{inbox.value}</span> : null}
                  </div>
                  <div className="text-[11px] text-[#86868b]">{r.proposition}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Opportunity</SectionTitle>
        <Field label="Feature interest">
          <ChipToggle options={FEATURES} value={c.feature_interest} onChange={(fi) => run(() => api.update("clubs", clubId, { feature_interest: fi }))} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pain points"><textarea className={inputClass} rows={2} value={pipe.pain_points} onChange={(e) => setPipe({ ...pipe, pain_points: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Demo date"><input type="date" className={inputClass} value={pipe.demo_on} onChange={(e) => setPipe({ ...pipe, demo_on: e.target.value })} /></Field>
            <Field label="Proposal status">
              <select className={inputClass} value={pipe.proposal_status} onChange={(e) => setPipe({ ...pipe, proposal_status: e.target.value })}>
                <option value="">—</option>
                <option>Drafting</option><option>Sent</option><option>Viewed</option><option>Accepted</option><option>Declined</option>
              </select>
            </Field>
          </div>
          <Field label="Reason for delay"><input className={inputClass} value={pipe.delay_reason} onChange={(e) => setPipe({ ...pipe, delay_reason: e.target.value })} placeholder="e.g. Waiting for new committee after AGM" /></Field>
          <Field label="Reason lost"><input className={inputClass} value={pipe.loss_reason} onChange={(e) => setPipe({ ...pipe, loss_reason: e.target.value })} /></Field>
        </div>
        <Btn small onClick={() => run(() => api.update("clubs", clubId, pipe))}>Save opportunity details</Btn>
        {detail?.proposals.length ? (
          <div className="text-xs">
            <Field label="Proposals sent from the Prospects tool">
              <ul className="space-y-0.5">
                {detail.proposals.map((p) => (
                  <li key={p.id}>
                    <a className="text-[#2D5DA8] hover:underline" href={`/proposal/${p.token}`} target="_blank" rel="noreferrer">{p.title}</a> · {p.status}
                    {p.sent_at ? ` · sent ${fmtDate(p.sent_at)}` : ""}{p.accepted_at ? ` · accepted ${fmtDate(p.accepted_at)}` : ""}
                  </li>
                ))}
              </ul>
            </Field>
          </div>
        ) : null}
      </section>

      {c.notes ? (
        <section>
          <SectionTitle>Notes</SectionTitle>
          <p className="whitespace-pre-wrap text-sm text-[#3a3a3c]">{c.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

// ---------- details ----------

const DETAIL_FIELDS: { key: keyof Club; label: string; type?: "number" | "date" | "textarea" }[] = [
  { key: "name", label: "Club name" },
  { key: "suburb", label: "Suburb" },
  { key: "region", label: "Region" },
  { key: "state", label: "State" },
  { key: "website", label: "Website" },
  { key: "approx_players", label: "Players (approx.)" },
  { key: "approx_teams", label: "Teams (approx.)", type: "number" },
  { key: "paid_umpires", label: "Paid umpires" },
  { key: "current_systems", label: "Current systems (PlayHQ, spreadsheets…)" },
  { key: "notes", label: "Notes", type: "textarea" },
  { key: "source_url", label: "Source URL" },
  { key: "source_note", label: "Source note" },
  { key: "verified_on", label: "Date checked", type: "date" },
];

function DetailsTab({ club, run, onDeleted }: { club: Club; run: (fn: () => Promise<unknown>) => Promise<void>; onDeleted: () => void }) {
  const init = () => ({
    ...Object.fromEntries(DETAIL_FIELDS.map((f) => [f.key, club[f.key] === null || club[f.key] === undefined ? "" : String(club[f.key])])),
    aliases: club.aliases.join("; "),
    facebook: club.social_links?.facebook ?? "",
    instagram: club.social_links?.instagram ?? "",
  });
  const [form, setForm] = useState<Record<string, string>>(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(init()), [club.updated_at]);

  const save = () => {
    const social: Record<string, string> = { ...(club.social_links ?? {}) };
    for (const k of ["facebook", "instagram"]) {
      if (form[k]) social[k] = form[k];
      else delete social[k];
    }
    const body: Record<string, unknown> = { social_links: social, aliases: form.aliases.split(";").map((s) => s.trim()).filter(Boolean) };
    for (const f of DETAIL_FIELDS) body[f.key] = form[f.key as string];
    return run(() => api.update("clubs", club.id, body));
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {DETAIL_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} className={f.type === "textarea" ? "sm:col-span-2" : undefined}>
            {f.type === "textarea" ? (
              <textarea className={inputClass} rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : (
              <input className={inputClass} type={f.type ?? "text"} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
        <Field label="Other names (; separated)" hint="Used to match this club on import"><input className={inputClass} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} /></Field>
        <Field label="Facebook"><input className={inputClass} value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></Field>
        <Field label="Instagram"><input className={inputClass} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></Field>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Btn kind="primary" onClick={save}>Save</Btn>
          <Btn onClick={() => run(() => api.update("clubs", club.id, { verified_on: todayISO() }))}>Mark checked today</Btn>
        </div>
        <Btn kind="danger" small onClick={() => {
          if (confirm(`Delete ${club.name} and all its committee records, contacts and history? This cannot be undone (the change log keeps a copy).`)) {
            run(() => api.remove("clubs", club.id)).then(onDeleted);
          }
        }}>Delete club</Btn>
      </div>
    </div>
  );
}

// ---------- sources & history ----------

function HistoryTab({ club, detail }: { club: Club; detail: Detail | null }) {
  const { ix, today } = useCrm();
  const appts = ix?.apptsByClub.get(club.id) ?? [];
  const cps = ix?.cpsByClub.get(club.id) ?? [];
  const sources = useMemo(() => {
    const rows: { what: string; url: string | null; note: string | null; on: string | null; v?: string }[] = [
      { what: "Club record", url: club.source_url, note: club.source_note, on: club.verified_on },
    ];
    for (const a of appts) {
      const p = a.person_id ? ix?.personById.get(a.person_id)?.full_name : "Vacant";
      rows.push({ what: `${p} — ${a.original_title ?? a.role_category} (${a.status})`, url: a.source_url, note: a.source_note, on: a.verified_on, v: a.verification });
    }
    for (const c of cps) rows.push({ what: `${c.kind === "email" ? "Email" : "Phone"} ${c.value}`, url: c.source_url, note: c.source_note, on: c.verified_on, v: c.verification });
    return rows;
  }, [club, appts, cps, ix]);

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Where each fact came from</SectionTitle>
        <div className="divide-y divide-black/5 rounded-xl border border-black/5 text-xs">
          {sources.map((s, i) => (
            <div key={i} className="grid gap-1 px-3 py-2 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="font-semibold text-[#3a3a3c]">{s.what}</div>
                <div className="text-[#6e6e73]">
                  {s.url ? <ExtLink href={hrefFor(s.url)}>{s.url}</ExtLink> : <span className="text-[#C8332B]">No source URL</span>}
                  {s.note ? ` · ${s.note}` : ""}
                </div>
              </div>
              <div className="flex items-start gap-1 sm:justify-end">
                {s.v ? <VerifChip v={s.v as Verification} verifiedOn={s.on} stale={isStale(s.on, today)} /> : null}
                <span className="whitespace-nowrap text-[#6e6e73]">{s.on ? `checked ${fmtDate(s.on)}` : "never checked"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>Change history</SectionTitle>
        {!detail ? <div className="text-xs text-[#86868b]">Loading…</div> : detail.changeLog.length === 0 ? <div className="text-xs text-[#86868b]">No changes recorded.</div> : (
          <ol className="space-y-2 text-xs">
            {detail.changeLog.map((l) => (
              <li key={l.id} className="rounded-lg border border-black/5 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2 text-[#6e6e73]">
                  <span><b className="text-[#3a3a3c]">{l.action}</b> · {l.entity.replace("crm_", "")}</span>
                  <span>{new Date(l.at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })} · {l.actor_email}</span>
                </div>
                <div className="mt-1 break-words font-mono text-[10.5px] text-[#6e6e73]">{summariseChanges(l.changes)}</div>
                {l.source_url || l.source_note ? <div className="mt-1 text-[#86868b]">Source: {l.source_url ?? ""} {l.source_note ?? ""}</div> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function summariseChanges(c: Record<string, unknown>): string {
  return Object.entries(c ?? {})
    .slice(0, 8)
    .map(([k, v]) => {
      if (v && typeof v === "object" && "from" in (v as object)) {
        const { from, to } = v as { from: unknown; to: unknown };
        return `${k}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`;
      }
      return `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`;
    })
    .join("  ·  ")
    .slice(0, 600);
}
