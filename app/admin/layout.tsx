import { redirect } from "next/navigation";
import Logo from "../components/Logo";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import AdminNav from "./AdminNav";

export const metadata = {
  title: "Admin — Sideline Pro",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware should already enforce these, but belt-and-braces in case
  // someone disables middleware or the matcher misses a path.
  if (!user) redirect("/login");
  if (!isAllowedEmail(user.email)) redirect("/login?error=not_allowed");

  return (
    <div className="relative min-h-screen bg-ink text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-900/80 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <a href="/admin" className="flex items-center gap-3">
            <Logo size={32} showWordmark />
            <span className="hidden text-xs uppercase tracking-[0.25em] text-gold sm:inline">
              Admin
            </span>
          </a>
          <AdminNav email={user.email ?? ""} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
