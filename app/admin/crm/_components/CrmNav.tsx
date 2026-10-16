"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useCrm } from "./CrmProvider";
import { cx } from "./ui";

const LINKS = [
  { href: "/admin/crm", label: "Associations" },
  { href: "/admin/crm/clubs", label: "All clubs" },
  { href: "/admin/crm/people", label: "People & roles" },
  { href: "/admin/crm/follow-ups", label: "Follow-ups" },
  { href: "/admin/crm/audiences", label: "Audiences" },
  { href: "/admin/crm/import", label: "Import" },
];

export default function CrmNav() {
  const pathname = usePathname() ?? "";
  const { reload, loading, error } = useCrm();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
      <div className="flex items-baseline gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Prospecting CRM</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/admin/crm"
                ? pathname === "/admin/crm" || pathname.startsWith("/admin/crm/associations")
                : pathname.startsWith(l.href);
            return (
              // Client-side navigation keeps the loaded CRM in memory.
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "rounded-md px-2.5 py-1 text-[13px] transition",
                  active ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73] hover:text-gold",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#86868b]">
        {error ? <span className="text-[#C8332B]">{error}</span> : null}
        <button type="button" onClick={() => reload()} title="Reload" className="rounded-md border border-black/10 p-1.5 hover:border-gold hover:text-gold">
          <RefreshCw className={cx("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
