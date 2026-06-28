"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email: email.trim(), password },
    );

    if (signInError || !data.user) {
      setSubmitting(false);
      setError(signInError?.message ?? "Sign in failed.");
      return;
    }

    // Middleware will enforce the email allowlist on the next request.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-[#6e6e73]">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-[10px] border border-black/15 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none ring-gold focus:border-gold focus:ring-1"
          placeholder="you@example.com"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-[#6e6e73]">
          Password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-[10px] border border-black/15 bg-white px-3 py-2 text-sm text-[#1d1d1f] outline-none ring-gold focus:border-gold focus:ring-1"
          placeholder="••••••••"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-[#C8332B]/30 bg-[#FBE9E7] px-3 py-2 text-xs text-[#C8332B]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full gold-bg px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
