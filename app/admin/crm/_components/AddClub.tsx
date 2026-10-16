"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/crm/client";
import { bestClubMatch } from "@/lib/crm/fuzzy";
import { todayISO } from "@/lib/crm/normalise";
import type { Club } from "@/lib/crm/types";
import { useCrm } from "./CrmProvider";
import { Btn, ErrorBox, Field, inputClass } from "./ui";

/** Add a club by hand — warns when it looks like one already in the CRM. */
export function AddClub({ associationId }: { associationId: string | null }) {
  const { snap, reload, openClub } = useCrm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", suburb: "", region: "", website: "", source_url: "" });
  const [assoc, setAssoc] = useState(associationId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dupe = form.name.trim().length > 2 && snap ? bestClubMatch(form.name, snap.clubs) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { record } = await api.create<Club>("clubs", {
        ...form,
        verified_on: form.source_url ? todayISO() : "",
      });
      if (assoc) await api.linkAssociation({ club_id: record.id, association_id: assoc, source_url: form.source_url, verification: form.source_url ? "verified" : "unverified" });
      await reload();
      setOpen(false);
      setForm({ name: "", suburb: "", region: "", website: "", source_url: "" });
      openClub(record.id);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Btn kind="primary" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add club</Btn>;
  return (
    <form onSubmit={save} className="w-full max-w-xl space-y-2 rounded-2xl border border-gold/50 bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Club name"><input className={inputClass} required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Association">
          <select className={inputClass} value={assoc} onChange={(e) => setAssoc(e.target.value)}>
            <option value="">None yet</option>
            {snap?.associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Suburb"><input className={inputClass} value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} /></Field>
        <Field label="Region"><input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Northern Beaches" /></Field>
        <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        <Field label="Source URL"><input className={inputClass} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Directory / committee page" /></Field>
      </div>
      {dupe ? (
        <div className="rounded-md bg-[#FDF1E0] px-3 py-2 text-xs text-[#9A6A1A]">
          {dupe.band === "exact" ? "Already in the CRM: " : "Looks like "}
          <button type="button" className="font-semibold underline" onClick={() => { setOpen(false); openClub(dupe.match.id); }}>{dupe.match.name}</button>
          {dupe.band === "exact" ? "." : " — open it instead if it's the same club."}
        </div>
      ) : null}
      <ErrorBox>{err}</ErrorBox>
      <div className="flex gap-2">
        <Btn kind="primary" type="submit" disabled={busy || !form.name.trim() || dupe?.band === "exact"}>{busy ? "Saving…" : "Add club"}</Btn>
        <Btn onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </form>
  );
}
