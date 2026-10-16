"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { STAGES, stageHex } from "@/lib/crm/constants";
import { associationCoverage, type AssociationCoverage } from "@/lib/crm/derive";
import { api } from "@/lib/crm/client";
import { useCrm } from "./_components/CrmProvider";
import { Btn, Card, ErrorBox, Field, Stat, inputClass } from "./_components/ui";

export default function CrmOverviewPage() {
  const { snap, views, ix, loading, reload } = useCrm();

  const cover = useMemo(() => {
    if (!snap || !ix) return [] as AssociationCoverage[];
    const all = [...views.values()];
    const rows = [...snap.associations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => associationCoverage(a, (ix.clubIdsByAssoc.get(a.id) ?? []).map((id) => views.get(id)!).filter(Boolean)));
    const unassigned = all.filter((v) => v.associations.length === 0);
    if (unassigned.length) rows.push(associationCoverage(null, unassigned));
    return rows;
  }, [snap, ix, views]);

  const totals = useMemo(() => {
    const all = [...views.values()];
    return {
      clubs: all.length,
      people: snap?.people.length ?? 0,
      needsResearch: all.filter((v) => v.needsResearch).length,
      due: all.filter((v) => v.followUp === "overdue" || v.followUp === "today").length,
      awaiting: all.filter((v) => v.awaitingReply).length,
      active: all.filter((v) => ["contacted", "engaged", "demo_booked", "proposal"].includes(v.club.stage)).length,
      won: all.filter((v) => v.club.stage === "won").length,
    };
  }, [views, snap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.015em]">Associations</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6e6e73]">
          Start with an association, open its club board, then open a club for its committee, contacts, history and next step.
        </p>
      </div>

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Clubs" value={totals.clubs} />
        <Stat label="People" value={totals.people} />
        <Stat label="Needs research" value={totals.needsResearch} />
        <Stat label="Follow-ups due" value={totals.due} tone={totals.due ? "red" : undefined} />
        <Stat label="Awaiting reply" value={totals.awaiting} tone="gold" />
        <Stat label="In conversation" value={totals.active} />
        <Stat label="Won" value={totals.won} tone="green" />
      </Card>

      {loading && !snap ? <Card className="p-8 text-center text-sm text-[#86868b]">Loading…</Card> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cover.map((c) => <AssociationTile key={c.association?.id ?? "unassigned"} c={c} />)}
          <AddAssociation onDone={reload} />
        </div>
      )}
    </div>
  );
}

function AssociationTile({ c }: { c: AssociationCoverage }) {
  const a = c.association;
  const href = `/admin/crm/associations/${a?.id ?? "unassigned"}`;
  const pct = Math.round(c.coverage * 100);
  return (
    <Link href={href} className="group rounded-[20px] border border-black/10 bg-white p-5 transition hover:-translate-y-[2px] hover:border-gold/60 hover:shadow-[0_14px_38px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">
            {a ? [a.short_name, a.region, a.state].filter(Boolean).join(" · ") : "Needs an association"}
          </div>
          <div className="mt-1 text-[18px] font-semibold leading-tight tracking-[-0.01em]">{a?.name ?? "Clubs not yet linked"}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{c.clubCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#86868b]">clubs</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-[#6e6e73]">
          <span>Priority roles found</span>
          <span className="font-semibold text-[#1d1d1f]">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f0f0f2]">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-[#86868b]">{c.fullyMapped} of {c.clubCount} clubs fully mapped</div>
      </div>

      {/* Stage mix as one stacked bar, same colours as the board. */}
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#f0f0f2]">
        {STAGES.map((s) => {
          const n = c.byStage[s.key] ?? 0;
          if (!n) return null;
          return <div key={s.key} title={`${s.label}: ${n}`} className="h-full" style={{ width: `${(n / c.clubCount) * 100}%`, background: stageHex(s.key) }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className={c.needsResearch ? "text-[#3a3a3c]" : "text-[#86868b]"}>{c.needsResearch} need research</span>
        <span className={c.followUpsDue ? "font-semibold text-[#C8332B]" : "text-[#86868b]"}>{c.followUpsDue} follow-ups due</span>
        <span className={c.won ? "text-[#1B7A47]" : "text-[#86868b]"}>{c.won} won</span>
      </div>
      <div className="mt-3 text-sm font-semibold text-gold group-hover:underline">Open board →</div>
    </Link>
  );
}

function AddAssociation({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", short_name: "", region: "", state: "NSW", website: "", source_url: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-black/15 text-sm text-[#86868b] hover:border-gold hover:text-gold">
        <Plus className="h-5 w-5" /> Add association
      </button>
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.create("associations", { ...form, verified_on: form.source_url ? new Date().toISOString().slice(0, 10) : "" });
      await onDone();
      setOpen(false);
      setForm({ name: "", short_name: "", region: "", state: "NSW", website: "", source_url: "" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-2 rounded-[20px] border border-gold/50 bg-white p-5">
      <div className="text-sm font-semibold">New association</div>
      <Field label="Name"><input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ku-ring-gai Netball Association" /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Short name"><input className={inputClass} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></Field>
        <Field label="Region"><input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
        <Field label="State"><input className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
      </div>
      <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <Field label="Source URL"><input className={inputClass} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Where this came from" /></Field>
      <ErrorBox>{err}</ErrorBox>
      <div className="flex gap-2">
        <Btn kind="primary" type="submit" disabled={busy || !form.name.trim()}>{busy ? "Saving…" : "Save"}</Btn>
        <Btn onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>
  );
}
