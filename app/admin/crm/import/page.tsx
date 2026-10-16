"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Upload } from "lucide-react";
import { ROLES, roleLabel } from "@/lib/crm/constants";
import { api } from "@/lib/crm/client";
import {
  CLUB_FIELDS, ROW_PERSON_FIELDS, SOURCE_FIELDS, autoMap, countDecisions, planImport,
  type ContactPlan, type Mapping, type PlanOverrides, type RowPlan,
} from "@/lib/crm/import";
import type { ApplyResult } from "@/lib/crm/apply-import";
import { parseDelimited, readXlsx, toTable, type Table, type XlsxSheet } from "@/lib/crm/tabular";
import { useCrm } from "../_components/CrmProvider";
import { Btn, Card, Chip, ErrorBox, Field, SectionTitle, Stat, cx, inputClass } from "../_components/ui";

type Step = "load" | "map" | "review" | "done";
type ConflictDecision = ContactPlan["conflictDecision"];

const contactKey = (row: number, i: number) => `${row}:${i}`;
const fieldKey = (row: number, field: string) => `${row}:${field}`;

export default function ImportPage() {
  const { snap, reload } = useCrm();
  const [step, setStep] = useState<Step>("load");
  const [filename, setFilename] = useState<string | null>(null);
  const [sheets, setSheets] = useState<XlsxSheet[] | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [sourceLabel, setSourceLabel] = useState("");
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [overrides, setOverrides] = useState<PlanOverrides>({ club: {} });
  const [conflicts, setConflicts] = useState<Record<string, ConflictDecision>>({});
  const [fields, setFields] = useState<Record<string, "keep" | "replace">>({});
  const [linkSame, setLinkSame] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"decisions" | "all" | "new" | "matched" | "skipped">("decisions");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);

  function loadTable(t: Table, name: string | null) {
    if (!t.rows.length) return setErr("That sheet has a header row but no data.");
    setTable(t);
    setFilename(name);
    setMapping(autoMap(t.headers));
    setOverrides({ club: {} });
    setConflicts({});
    setFields({});
    setLinkSame({});
    setStep("map");
  }

  async function onFile(file: File) {
    setErr(null);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const s = await readXlsx(await file.arrayBuffer());
        if (!s.length) return setErr("No sheets found in that workbook.");
        if (s.length === 1) return loadTable(toTable(s[0].grid), file.name);
        setSheets(s);
        setFilename(file.name);
        return;
      }
      if (/\.xls$/i.test(file.name)) return setErr("Old .xls files aren't supported — save as .xlsx or CSV first.");
      loadTable(toTable(parseDelimited(await file.text())), file.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  // ---- plan, re-run whenever mapping or a structural decision changes ----
  const plan = useMemo(() => (table && snap && step !== "load" ? planImport(table, mapping, snap, overrides) : null), [table, mapping, snap, overrides, step]);

  /** The plan with every reviewer decision applied — what gets committed. */
  const resolved: RowPlan[] = useMemo(() => {
    if (!plan) return [];
    return plan.rows.map((r) => ({
      ...r,
      club: r.club && {
        ...r.club,
        needsDecision: r.club.needsDecision && overrides.club?.[r.row] === undefined,
        conflicts: r.club.conflicts.map((c) => ({ ...c, decision: fields[fieldKey(r.row, c.field)] ?? "keep" })),
      },
      contacts: r.contacts.map((c, i) => ({
        ...c,
        conflictDecision: c.roleConflict.length ? conflicts[contactKey(r.row, i)] ?? "undecided" : "undecided",
        linkToPossible: !!linkSame[contactKey(r.row, i)],
      })),
    }));
  }, [plan, overrides, fields, conflicts, linkSame]);
  const open = countDecisions(resolved);

  async function commit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.commitImport<ApplyResult>({ rows: resolved, filename, sourceLabel, mapping });
      setResult(res);
      setStep("done");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const shownRows = resolved.filter((r) => {
    if (view === "skipped") return r.skip;
    if (r.skip) return view === "all";
    if (view === "decisions") return r.club?.needsDecision || r.contacts.some((c) => c.roleConflict.length && c.conflictDecision === "undecided") || r.club?.conflicts.length || r.issues.length || r.contacts.some((c) => c.possibleSamePerson.length);
    if (view === "new") return r.club?.action === "create";
    if (view === "matched") return r.club?.action === "match";
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.015em]">Import research</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#6e6e73]">
          Bring in a spreadsheet of clubs and committee contacts. Nothing is written until you approve the preview.
          Existing clubs and people are matched rather than duplicated, existing values are never overwritten
          without your say-so, and every imported fact keeps its source and date.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        {(["load", "map", "review", "done"] as Step[]).map((s, i) => (
          <span key={s} className={cx("rounded-full px-3 py-1 font-semibold", step === s ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#86868b]")}>
            {i + 1}. {s === "load" ? "Load" : s === "map" ? "Map columns" : s === "review" ? "Review" : "Done"}
          </span>
        ))}
      </div>
      <ErrorBox>{err}</ErrorBox>

      {step === "load" && (
        <Card className="space-y-4 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-black/20 px-6 py-10 text-sm text-[#6e6e73] hover:border-gold">
            <Upload className="h-6 w-6" />
            <span><b>Choose a file</b> — .xlsx, .csv or .tsv</span>
            <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {sheets ? (
            <Field label={`${filename} has ${sheets.length} sheets — choose one`}>
              <div className="flex flex-wrap gap-2">
                {sheets.map((s) => <Btn key={s.name} onClick={() => loadTable(toTable(s.grid), `${filename} › ${s.name}`)}>{s.name} ({Math.max(0, s.grid.length - 1)} rows)</Btn>)}
              </div>
            </Field>
          ) : null}
          <Field label="…or paste rows straight from Google Sheets / Excel (include the header row)">
            <textarea className={cx(inputClass, "font-mono text-xs")} rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} />
          </Field>
          <Btn onClick={() => loadTable(toTable(parseDelimited(paste)), "Pasted rows")} disabled={!paste.trim()}>Use pasted rows</Btn>
          <div className="rounded-lg bg-[#fafafa] p-3 text-xs text-[#6e6e73]">
            <b>Two layouts work.</b> One row per club with columns like <i>Treasurer name</i>, <i>Treasurer email</i>, <i>President</i>… —
            or one row per contact with <i>Club</i>, <i>Name</i>, <i>Role</i>, <i>Email</i>, <i>Phone</i>. Add <i>Source URL</i> and
            <i> Date checked</i> columns where you have them. Cells like “Not published” or “N/A” are treated as blank.
          </div>
        </Card>
      )}

      {step === "map" && table && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="text-sm"><b>{filename}</b> · {table.rows.length} rows · {table.headers.length} columns</div>
            <Field label="Describe this source (saved with every record)" className="w-full max-w-md">
              <input className={inputClass} value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. Rowan's Ku-ring-gai committee research, Oct 2026" />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-[#f5f5f7] text-[10px] uppercase tracking-wider text-[#86868b]">
                <tr><th className="px-3 py-2 text-left">Column in your sheet</th><th className="px-3 py-2 text-left">Sample values</th><th className="px-3 py-2 text-left">Import as</th></tr>
              </thead>
              <tbody>
                {table.headers.map((h, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-2 font-semibold">{h}</td>
                    <td className="max-w-[320px] px-3 py-2 text-[#6e6e73]">
                      {table.rows.slice(0, 3).map((r, j) => <div key={j} className="truncate">{r[i] || <span className="text-[#c7c7cc]">blank</span>}</div>)}
                    </td>
                    <td className="px-3 py-2">
                      <select className={cx(inputClass, !mapping[i] && "text-[#86868b]")} value={mapping[i] ?? ""} onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}>
                        <option value="">Don&apos;t import</option>
                        <optgroup label="Club">{CLUB_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>
                        <optgroup label="One contact per row">{ROW_PERSON_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>
                        {ROLES.filter((r) => r.key !== "other").map((r) => (
                          <optgroup key={r.key} label={`${r.label} column`}>
                            {(["name", "email", "phone"] as const).map((p) => <option key={p} value={`role:${r.key}:${p}`}>{r.label} — {p}</option>)}
                          </optgroup>
                        ))}
                        <optgroup label="Source">{SOURCE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!Object.values(mapping).includes("club.name") ? <ErrorBox>Map one column to “Club name” — every row needs a club.</ErrorBox> : null}
          <div className="flex gap-2">
            <Btn onClick={() => { setStep("load"); setTable(null); setSheets(null); }}>Back</Btn>
            <Btn kind="primary" disabled={!Object.values(mapping).includes("club.name")} onClick={() => setStep("review")}>Preview import →</Btn>
          </div>
        </Card>
      )}

      {step === "review" && plan && (
        <div className="space-y-4">
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Rows" value={plan.summary.rows} />
            <Stat label="New clubs" value={plan.summary.clubsNew} />
            <Stat label="Matched clubs" value={plan.summary.clubsMatched} />
            <Stat label="New people" value={plan.summary.peopleNew} />
            <Stat label="New roles" value={plan.summary.appointmentsNew} />
            <Stat label="New emails/phones" value={plan.summary.contactPointsNew} />
            <Stat label="Decisions left" value={open} tone={open ? "red" : "green"} />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 text-xs">
              {([["decisions", "Needs a look"], ["all", "All rows"], ["new", "New clubs"], ["matched", "Matched clubs"], ["skipped", `Skipped (${plan.summary.skipped})`]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setView(k)} className={cx("rounded-md px-2.5 py-1 font-semibold", view === k ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73] hover:text-gold")}>{l}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => setStep("map")}>← Mapping</Btn>
              <Btn kind="primary" disabled={!!open || busy} onClick={commit}>{busy ? "Importing…" : open ? `${open} decision${open === 1 ? "" : "s"} left` : "Import"}</Btn>
            </div>
          </div>

          {shownRows.length === 0 ? <Card className="p-6 text-center text-sm text-[#86868b]">{view === "decisions" ? "Nothing needs a decision — check “All rows” then import." : "No rows here."}</Card> : null}
          {shownRows.map((r) => (
            <div key={r.row} data-import-row={r.row}>
            <RowCard
              r={r}
              raw={table!.rows[r.row]}
              headers={table!.headers}
              onClub={(c) => setOverrides({ club: { ...overrides.club, [r.row]: c } })}
              clubChoice={overrides.club?.[r.row]}
              onField={(field, d) => setFields({ ...fields, [fieldKey(r.row, field)]: d })}
              onConflict={(i, d) => setConflicts({ ...conflicts, [contactKey(r.row, i)]: d })}
              onLinkSame={(i, v) => setLinkSame({ ...linkSame, [contactKey(r.row, i)]: v })}
            />
            </div>
          ))}
        </div>
      )}

      {step === "done" && result && (
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-lg font-semibold"><Check className="h-5 w-5 text-[#1B7A47]" /> Import complete</div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Clubs created" value={result.clubsCreated} />
            <Stat label="Clubs updated" value={result.clubsUpdated} />
            <Stat label="People added" value={result.peopleCreated} />
            <Stat label="Roles added" value={result.appointmentsCreated} />
            <Stat label="Committee changes" value={result.handovers} />
            <Stat label="Emails / phones added" value={result.contactPointsCreated} />
            <Stat label="Associations added" value={result.associationsCreated} />
            <Stat label="Re-confirmed" value={result.reverified} />
          </div>
          {result.errors.length ? (
            <ErrorBox>
              {result.errors.length} row{result.errors.length === 1 ? "" : "s"} failed and were not imported:
              <ul className="mt-1 list-disc pl-5">{result.errors.map((e) => <li key={e.row}>Row {e.row + 2}: {e.message}</li>)}</ul>
            </ErrorBox>
          ) : null}
          <div className="text-xs text-[#86868b]">Import id {result.importId} — every change is in each club’s Sources & history tab.</div>
          <div className="flex gap-2">
            <Btn kind="primary" onClick={() => { setStep("load"); setTable(null); setSheets(null); setResult(null); setPaste(""); }}>Import another</Btn>
            <a href="/admin/crm" className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">Go to associations</a>
          </div>
        </Card>
      )}
    </div>
  );
}

function RowCard({
  r, raw, headers, onClub, clubChoice, onField, onConflict, onLinkSame,
}: {
  r: RowPlan;
  raw: string[];
  headers: string[];
  onClub: (c: "link" | "create") => void;
  clubChoice: "link" | "create" | undefined;
  onField: (field: string, d: "keep" | "replace") => void;
  onConflict: (i: number, d: ConflictDecision) => void;
  onLinkSame: (i: number, v: boolean) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const c = r.club;
  return (
    <Card className={cx("p-4", r.skip && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] text-[#86868b]">Row {r.row + 2}</div>
          <div className="text-[15px] font-semibold">{c?.name ?? "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          {c ? (
            c.action === "create" ? <Chip className="bg-[#E6EEF9] text-[#2D5DA8]">New club</Chip> : <Chip className="bg-[#E7F6EE] text-[#1B7A47]">Matches {c.matchedName}</Chip>
          ) : null}
          <button type="button" className="text-[11px] text-[#86868b] hover:text-gold" onClick={() => setShowRaw((s) => !s)}>{showRaw ? "hide" : "show"} sheet row</button>
        </div>
      </div>

      {showRaw ? (
        <div className="mt-2 grid gap-x-4 rounded-lg bg-[#fafafa] p-2 text-[11px] sm:grid-cols-2">
          {headers.map((h, i) => raw[i] ? <div key={i}><span className="text-[#86868b]">{h}:</span> {raw[i]}</div> : null)}
        </div>
      ) : null}

      {r.issues.length ? <div className="mt-2 space-y-0.5 text-xs text-[#9A6A1A]">{r.issues.map((i, k) => <div key={k}>⚠ {i}</div>)}</div> : null}

      {c && c.band && c.band !== "exact" ? (
        <div className={cx("mt-3 rounded-lg p-3 text-xs", c.needsDecision ? "border border-[#E0A82E] bg-[#FDF6E9]" : "bg-[#fafafa]")}>
          <div className="flex items-center gap-1 font-semibold">
            {c.needsDecision ? <AlertTriangle className="h-3.5 w-3.5 text-[#B4711B]" /> : null}
            “{c.name}” looks like <u>{c.matchedName}</u> ({Math.round(c.score * 100)}% similar). Same club?
          </div>
          <div className="mt-2 flex gap-2">
            <Btn small kind={clubChoice === "link" || (!clubChoice && c.action === "match") ? "primary" : "secondary"} onClick={() => onClub("link")}>Yes — same club</Btn>
            <Btn small kind={clubChoice === "create" || (!clubChoice && c.action === "create") ? "primary" : "secondary"} onClick={() => onClub("create")}>No — add as a new club</Btn>
          </div>
        </div>
      ) : null}

      {c && (Object.keys(c.fills).length || c.conflicts.length) ? (
        <div className="mt-3 text-xs">
          {Object.keys(c.fills).length ? (
            <div className="text-[#6e6e73]"><b className="text-[#3a3a3c]">{c.action === "create" ? "Club details" : "Fills blanks"}:</b> {Object.entries(c.fills).map(([k, v]) => `${k.replace(/_/g, " ")} = ${v}`).join(" · ")}</div>
          ) : null}
          {c.conflicts.map((x) => (
            <div key={x.field} className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md bg-[#fafafa] px-2 py-1.5">
              <b>{x.field.replace(/_/g, " ")}</b>
              <span className="text-[#6e6e73]">CRM has “{x.existing}”, sheet says “{x.incoming}”</span>
              <select className="rounded border border-black/10 px-1 py-0.5" value={x.decision} onChange={(e) => onField(x.field, e.target.value as "keep" | "replace")}>
                <option value="keep">Keep CRM value</option>
                <option value="replace">Use sheet value</option>
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {r.associations.length ? (
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {r.associations.map((a) => <Chip key={a.name} className={a.action === "create" ? "bg-[#E6EEF9] text-[#2D5DA8]" : "bg-[#f5f5f7] text-[#3a3a3c]"}>{a.action === "create" ? "New association: " : ""}{a.name}</Chip>)}
        </div>
      ) : null}

      {r.clubContactPoints.length ? (
        <div className="mt-2 text-xs text-[#6e6e73]">General club contacts: {r.clubContactPoints.map((p) => `${p.value}${p.action === "exists" ? " (already on file)" : ""}`).join(", ")}</div>
      ) : null}

      {r.contacts.length ? (
        <div className="mt-3">
          <SectionTitle>Contacts</SectionTitle>
          <div className="divide-y divide-black/5 rounded-lg border border-black/5">
            {r.contacts.map((ct, i) => (
              <div key={i} className="px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{roleLabel(ct.roleKey)}</b>
                  <span>{ct.name ?? <span className="text-[#86868b]">no name — role inbox only</span>}</span>
                  {ct.person.action === "create" ? <Chip className="bg-[#E6EEF9] text-[#2D5DA8]">new person</Chip> : ct.person.action === "match" ? <Chip className="bg-[#E7F6EE] text-[#1B7A47]" title={ct.person.reason}>matched: {ct.person.matchedName}</Chip> : null}
                  {ct.appointment.action === "create" ? <Chip className="bg-[#f5f5f7] text-[#3a3a3c]">new role{ct.appointment.status === "unverified" ? " (unconfirmed)" : ""}</Chip> : ct.appointment.action === "exists" ? <Chip className="bg-[#f5f5f7] text-[#86868b]">role already recorded</Chip> : null}
                  {ct.notes ? <span className="italic text-[#86868b]">note: {ct.notes}</span> : null}
                </div>
                {ct.contactPoints.length ? (
                  <div className="mt-1 text-[#6e6e73]">
                    {ct.contactPoints.map((p) => (
                      <span key={p.value} className="mr-3">
                        {p.value} <span className="text-[#86868b]">({p.inbox_type}{p.role_category && p.role_category !== ct.roleKey ? ` · ${roleLabel(p.role_category)}` : ""}{p.linkPerson ? "" : ", club only"}{p.action === "exists" ? ", on file" : ""})</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                {ct.possibleSamePerson.length ? (
                  <label className="mt-1 flex items-center gap-1.5 text-[#6B3FA0]">
                    <input type="checkbox" checked={ct.linkToPossible} onChange={(e) => onLinkSame(i, e.target.checked)} />
                    Same person as {ct.possibleSamePerson[0].name} ({ct.possibleSamePerson[0].clubName})? Tick to link instead of adding someone new.
                  </label>
                ) : null}
                {ct.roleConflict.length ? (
                  <div className={cx("mt-2 rounded-md p-2", ct.conflictDecision === "undecided" ? "border border-[#E0A82E] bg-[#FDF6E9]" : "bg-[#fafafa]")}>
                    <div className="font-semibold">
                      {ct.roleConflict.map((x) => x.personName).join(" and ")} {ct.roleConflict.length > 1 ? "are" : "is"} recorded as {roleLabel(ct.roleKey).toLowerCase()}. What changed?
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3">
                      {([["handover", `${ct.name} took over (keep ${ct.roleConflict[0].personName} as former)`], ["add", "Both hold the role"], ["skip", "Skip this contact"]] as const).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-1"><input type="radio" checked={ct.conflictDecision === k} onChange={() => onConflict(i, k)} /> {l}</label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
