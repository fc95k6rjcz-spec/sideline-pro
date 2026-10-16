"use client";

import { type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PRIORITY_ROLES, stageDef } from "@/lib/crm/constants";
import type { FollowUpState } from "@/lib/crm/derive";
import type { Verification } from "@/lib/crm/types";

// Shared building blocks for the CRM screens. Visual language follows the
// rest of /admin: white cards, #1d1d1f ink, gold accent, small caps labels.

export const inputClass =
  "w-full rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-sm text-[#1d1d1f] outline-none focus:border-gold disabled:bg-[#f5f5f7]";

/** Class names with Tailwind conflicts resolved ("w-full w-auto" → "w-auto"). */
export function cx(...c: ClassValue[]) {
  return twMerge(clsx(c));
}

/** Compact "⋯" action menu built on a native select. */
export const menuClass =
  "w-7 cursor-pointer appearance-none rounded border-0 bg-transparent text-center text-[13px] text-[#86868b] outline-none hover:bg-[#f5f5f7] hover:text-[#1d1d1f]";

export function Label({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">{children}</span>;
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
      {hint ? <div className="mt-1 text-[11px] text-[#86868b]">{hint}</div> : null}
    </label>
  );
}

export function Btn({
  children, onClick, kind = "secondary", type = "button", disabled, small, title, className,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  small?: boolean;
  title?: string;
  className?: string;
}) {
  const base = small ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";
  const tone =
    kind === "primary"
      ? "gold-bg font-bold text-[#1d1d1f] hover:opacity-90"
      : kind === "danger"
        ? "border border-[#C8332B]/30 text-[#C8332B] hover:bg-[#FBE9E7]"
        : kind === "ghost"
          ? "text-[#6e6e73] hover:text-gold"
          : "border border-black/10 bg-white text-[#3a3a3c] hover:border-gold hover:text-gold";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx("inline-flex items-center gap-1.5 rounded-md font-semibold uppercase tracking-wider transition disabled:opacity-50", base, tone, className)}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-black/10 bg-white", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold tracking-tight text-[#1d1d1f]">{children}</h3>
      {right}
    </div>
  );
}

export function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold", className ?? "bg-[#EEF0F3] text-[#5A5A5F]")}>
      {children}
    </span>
  );
}

export function StageChip({ stage }: { stage: string }) {
  const s = stageDef(stage);
  return <Chip className={s.chip}>{s.label}</Chip>;
}

export function VerifChip({ v, verifiedOn, stale }: { v: Verification; verifiedOn?: string | null; stale?: boolean }) {
  const tone =
    v === "verified" ? "bg-[#E7F6EE] text-[#1B7A47]" : v === "suggested" ? "bg-[#EFE5F8] text-[#6B3FA0]" : "bg-[#F0F0F2] text-[#6E6E73]";
  return (
    <span className="inline-flex items-center gap-1">
      <Chip className={tone} title={verifiedOn ? `Last checked ${verifiedOn}` : "Never checked"}>
        {v === "verified" ? "Verified" : v === "suggested" ? "Suggested" : "Unverified"}
      </Chip>
      {stale ? (
        <Chip className="bg-[#FDF1E0] text-[#9A6A1A]" title="Checked before this AGM season or over a year ago — re-check">
          Re-check
        </Chip>
      ) : null}
    </span>
  );
}

const FOLLOW_TONE: Record<FollowUpState, string> = {
  overdue: "text-[#C8332B] font-semibold",
  today: "text-[#B4711B] font-semibold",
  soon: "text-[#9A6A1A]",
  later: "text-[#6e6e73]",
  none: "text-[#86868b]",
};
export function followClass(s: FollowUpState) {
  return FOLLOW_TONE[s];
}

/** One dot per priority role: filled = found, hollow = missing. */
export function RoleDots({ found }: { found: Set<string> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRIORITY_ROLES.map((r) => {
        const has = found.has(r.key);
        return (
          <span
            key={r.key}
            title={`${r.label}: ${has ? "found" : "missing"}`}
            className={cx(
              "inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[9.5px] font-bold",
              has ? "bg-[#1d1d1f] text-white" : "border border-dashed border-black/25 text-[#a1a1a6]",
            )}
          >
            {r.short}
          </span>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-5 py-8 text-center text-sm text-[#86868b]">{children}</div>;
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-3 py-2 text-sm text-[#C8332B]">{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "red" | "gold" | "green" }) {
  const c = tone === "red" ? "text-[#C8332B]" : tone === "gold" ? "text-gold" : tone === "green" ? "text-[#1B7A47]" : "text-[#1d1d1f]";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tracking-tight", c)}>{value}</div>
    </div>
  );
}

/** Multi-select as toggle chips. */
export function ChipToggle<T extends string>({
  options, value, onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o.key) : [...value, o.key])}
            className={cx(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              on ? "border-gold bg-[rgba(189,138,44,0.12)] text-[#8A6418]" : "border-black/10 text-[#6e6e73] hover:border-gold",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-black/10">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cx(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition",
            value === t.key ? "border-gold text-[#1d1d1f]" : "border-transparent text-[#86868b] hover:text-[#1d1d1f]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ExtLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#2D5DA8] hover:underline">
      {children}
    </a>
  );
}
