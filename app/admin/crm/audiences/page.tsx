"use client";

import { useMemo, useState } from "react";
import { AUDIENCE_PRESETS, RECIPIENT_CSV_HEADERS, buildAudience, recipientRows, type AudienceFilters } from "@/lib/crm/audience";
import { BACKGROUND_TAGS, FEATURES, ROLES, STAGES } from "@/lib/crm/constants";
import { api, downloadText } from "@/lib/crm/client";
import { toCsv } from "@/lib/crm/tabular";
import { useCrm } from "../_components/CrmProvider";
import { Btn, Card, Chip, ChipToggle, Empty, Field, SectionTitle, Stat, Tabs, cx, inputClass } from "../_components/ui";

const ROLE_OPTS = ROLES.filter((r) => r.key !== "other").map((r) => ({ key: r.key, label: r.label }));
const STAGE_OPTS = STAGES.map((s) => ({ key: s.key, label: s.label }));

export default function AudiencesPage() {
  const { snap, reload, openClub, today } = useCrm();
  const [f, setF] = useState<AudienceFilters>({ roles: ["treasurer"], verifiedOnly: false });
  const [name, setName] = useState("");
  const [tab, setTab] = useState<"recipients" | "missing" | "excluded">("recipients");
  const [err, setErr] = useState<string | null>(null);

  const result = useMemo(() => (snap ? buildAudience(snap, f, today) : null), [snap, f, today]);
  const regions = useMemo(() => [...new Set((snap?.clubs ?? []).map((c) => c.region).filter(Boolean) as string[])].sort(), [snap]);
  const set = <K extends keyof AudienceFilters>(k: K, v: AudienceFilters[K]) => setF({ ...f, [k]: v });

  async function save() {
    setErr(null);
    try {
      await api.create("audiences", { name: name.trim(), filters: f });
      setName("");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
  }

  function exportCsv() {
    if (!result) return;
    downloadText(`sidelinepro-audience-${(name || "export").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today}.csv`, toCsv([RECIPIENT_CSV_HEADERS, ...recipientRows(result.recipients)]));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.015em]">Audiences</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#6e6e73]">
          Build a mailing list from the CRM. Each person appears once (with every role they hold), shared inboxes once,
          and the general club address only when you allow it as a fallback. Unsubscribed, suppressed, bounced and
          work-research addresses are always left out. Gmail sending is Phase 3 — for now, export the list.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <SectionTitle>Start from</SectionTitle>
            <div className="flex flex-col gap-1">
              {AUDIENCE_PRESETS.map((p) => (
                <button key={p.name} type="button" onClick={() => setF(p.filters)} className="rounded-md px-2 py-1 text-left text-xs text-[#3a3a3c] hover:bg-[#f5f5f7] hover:text-gold">{p.name}</button>
              ))}
            </div>
            {snap?.audiences.length ? (
              <>
                <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">Saved</div>
                {snap.audiences.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => { setF(a.filters as AudienceFilters); setName(a.name); }} className="rounded-md px-2 py-1 text-left text-xs font-semibold hover:text-gold">{a.name}</button>
                    <button type="button" className="text-[11px] text-[#86868b] hover:text-[#C8332B]" onClick={() => confirm(`Delete "${a.name}"?`) && api.remove("audiences", a.id).then(reload)}>×</button>
                  </div>
                ))}
              </>
            ) : null}
          </Card>

          <Card className="space-y-3 p-4">
            <SectionTitle right={<Btn small kind="ghost" onClick={() => setF({})}>Clear</Btn>}>Filters</SectionTitle>
            <Field label="Roles"><ChipToggle options={ROLE_OPTS} value={f.roles ?? []} onChange={(v) => set("roles", v)} /></Field>
            <Field label="Role search" hint="Normalised: “umpire coordinator” matches convenors"><input className={inputClass} value={f.roleQuery ?? ""} onChange={(e) => set("roleQuery", e.target.value)} /></Field>
            <Field label="Associations">
              <ChipToggle options={[...(snap?.associations ?? []).map((a) => ({ key: a.id, label: a.short_name || a.name }))]} value={f.associationIds ?? []} onChange={(v) => set("associationIds", v)} />
              <label className="mt-1 flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!f.includeUnassigned} onChange={(e) => set("includeUnassigned", e.target.checked)} /> Include clubs with no association</label>
            </Field>
            {regions.length ? <Field label="Regions"><ChipToggle options={regions.map((r) => ({ key: r, label: r }))} value={f.regions ?? []} onChange={(v) => set("regions", v)} /></Field> : null}
            <Field label="Stages"><ChipToggle options={STAGE_OPTS} value={f.stages ?? []} onChange={(v) => set("stages", v)} /></Field>
            <Field label="Contact history">
              <select className={inputClass} value={f.contactState ?? "any"} onChange={(e) => set("contactState", e.target.value as AudienceFilters["contactState"])}>
                <option value="any">Any</option><option value="never">Not contacted yet</option><option value="awaiting_reply">Contacted, no reply</option><option value="replied">Has replied</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Last contact before"><input type="date" className={inputClass} value={f.lastContactBefore ?? ""} onChange={(e) => set("lastContactBefore", e.target.value || undefined)} /></Field>
              <Field label="Last contact after"><input type="date" className={inputClass} value={f.lastContactAfter ?? ""} onChange={(e) => set("lastContactAfter", e.target.value || undefined)} /></Field>
            </div>
            <Field label="Feature interest"><ChipToggle options={FEATURES} value={f.featureInterest ?? []} onChange={(v) => set("featureInterest", v)} /></Field>
            <Field label="Confirmed professional background"><ChipToggle options={BACKGROUND_TAGS} value={f.backgrounds ?? []} onChange={(v) => set("backgrounds", v)} /></Field>
            <Field label="Champion">
              <select className={inputClass} value={f.champion ?? "any"} onChange={(e) => set("champion", e.target.value as AudienceFilters["champion"])}>
                <option value="any">Any club</option><option value="potential">Clubs with a potential or confirmed champion</option><option value="confirmed">Clubs with a confirmed champion</option>
              </select>
            </Field>
            <div className="space-y-1 text-xs">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.verifiedOnly} onChange={(e) => set("verifiedOnly", e.target.checked)} /> Verified roles and addresses only</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.generalFallback} onChange={(e) => set("generalFallback", e.target.checked)} /> Use the general club inbox where no role contact exists</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.generalOnly} onChange={(e) => setF({ ...f, generalOnly: e.target.checked, generalFallback: e.target.checked || f.generalFallback })} /> Only clubs where a general inbox is all we have</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.followUpDue} onChange={(e) => set("followUpDue", e.target.checked)} /> Follow-up due today or overdue</label>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!result ? <Card className="p-8 text-center text-sm text-[#86868b]">Loading…</Card> : (
            <>
              <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
                <Stat label="Recipients" value={result.recipients.length} tone="gold" />
                <Stat label="Clubs reached" value={`${result.clubsReached} / ${result.clubsInScope}`} />
                <Stat label="Clubs missing a contact" value={result.clubsMissing.length} tone={result.clubsMissing.length ? "red" : undefined} />
                <Stat label="People with no email" value={result.peopleWithoutEmail.length} />
                <Stat label="Need re-check" value={result.staleCount} />
              </Card>
              <div className="flex flex-wrap items-center gap-2">
                <input className={cx(inputClass, "w-64")} placeholder="Name this audience" value={name} onChange={(e) => setName(e.target.value)} />
                <Btn onClick={save} disabled={!name.trim()}>Save audience</Btn>
                <Btn kind="primary" onClick={exportCsv} disabled={!result.recipients.length}>Export {result.recipients.length} recipients (CSV)</Btn>
                {err ? <span className="text-xs text-[#C8332B]">{err}</span> : null}
              </div>
              {result.staleCount ? (
                <div className="rounded-lg bg-[#FDF1E0] px-3 py-2 text-xs text-[#9A6A1A]">
                  {result.staleCount} address{result.staleCount === 1 ? " was" : "es were"} last checked before this AGM season — committees may have changed. They are marked in the export.
                </div>
              ) : null}

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: "recipients", label: `Recipients (${result.recipients.length})` },
                  { key: "missing", label: `Missing information (${result.clubsMissing.length + result.peopleWithoutEmail.length})` },
                  { key: "excluded", label: `Left out (${result.excluded.length})` },
                ]}
              />
              {tab === "recipients" ? (
                <Card className="overflow-hidden">
                  {result.recipients.length === 0 ? <Empty>No one matches these filters.</Empty> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-xs">
                        <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
                          <tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Role(s)</th><th className="px-3 py-2 text-left">Club(s)</th><th className="px-3 py-2 text-left">Type</th></tr>
                        </thead>
                        <tbody>
                          {result.recipients.map((r) => (
                            <tr key={r.emailNorm} className="border-t border-black/5 align-top">
                              <td className="px-3 py-2">{r.email}{r.stale ? <Chip className="ml-1 bg-[#FDF1E0] text-[#9A6A1A]">re-check</Chip> : null}</td>
                              <td className="px-3 py-2">{r.names.join(", ") || <span className="text-[#86868b]">Name unknown</span>}</td>
                              <td className="px-3 py-2">{r.roles.join(", ")}</td>
                              <td className="px-3 py-2">{r.clubIds.map((id, i) => <button key={id} type="button" className="mr-1 hover:text-gold" onClick={() => openClub(id)}>{r.clubNames[i]}{i < r.clubIds.length - 1 ? "," : ""}</button>)}</td>
                              <td className="px-3 py-2">
                                <Chip className={cx(r.via === "general_fallback" ? "bg-[#FDF1E0] text-[#9A6A1A]" : "bg-[#f5f5f7] text-[#6e6e73]")}>
                                  {r.via === "general_fallback" ? "General inbox (fallback)" : r.via === "role_inbox" ? "Role inbox" : "Personal"}
                                </Chip>
                                {r.verification !== "verified" ? <Chip className="ml-1 bg-[#F0F0F2] text-[#6E6E73]">unverified</Chip> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              ) : tab === "missing" ? (
                <div className="space-y-3">
                  <Card className="divide-y divide-black/5">
                    <div className="px-4 py-2 text-xs font-semibold">Clubs with no address for these roles</div>
                    {result.clubsMissing.length === 0 ? <Empty>Every club in scope is reachable.</Empty> : result.clubsMissing.map((m) => (
                      <button key={m.clubId} type="button" onClick={() => openClub(m.clubId)} className="flex w-full items-center justify-between px-4 py-2 text-left text-xs hover:bg-[#fafafa]">
                        <span className="font-semibold">{m.clubName}</span>
                        <span className="text-[#86868b]">Missing: {m.missing.join(", ")}{m.hasGeneral ? " · general inbox available" : ""}</span>
                      </button>
                    ))}
                  </Card>
                  <Card className="divide-y divide-black/5">
                    <div className="px-4 py-2 text-xs font-semibold">Named contacts with no usable email</div>
                    {result.peopleWithoutEmail.length === 0 ? <Empty>None.</Empty> : result.peopleWithoutEmail.map((p) => (
                      <div key={`${p.personId}-${p.clubName}-${p.role}`} className="px-4 py-2 text-xs">{p.name} — {p.role}, {p.clubName}</div>
                    ))}
                  </Card>
                </div>
              ) : (
                <Card className="divide-y divide-black/5">
                  {result.excluded.length === 0 ? <Empty>Nothing was left out.</Empty> : result.excluded.map((e, i) => (
                    <div key={i} className="flex justify-between gap-2 px-4 py-2 text-xs">
                      <span>{e.email}{e.name ? ` · ${e.name}` : ""} · {e.clubName}</span>
                      <span className="text-[#C8332B]">{e.reason}</span>
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
