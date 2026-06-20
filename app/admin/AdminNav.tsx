"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/invoice", label: "Invoices" },
  { href: "/admin/receipts", label: "Expenses" },
  { href: "/admin/prospects", label: "Prospects" },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-4">
      <nav className="hidden gap-5 text-sm text-neutral-300 md:flex">
        {links.map((l) => {
          const active =
            l.href === "/admin"
              ? pathname === "/admin"
              : pathname?.startsWith(l.href);
          return (
            <a
              key={l.href}
              href={l.href}
              className={
                active
                  ? "text-gold"
                  : "hover:text-gold transition-colors"
              }
            >
              {l.label}
            </a>
          );
        })}
      </nav>
      <span className="hidden text-xs text-neutral-500 lg:inline">
        {email}
      </span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:border-gold hover:text-gold"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
