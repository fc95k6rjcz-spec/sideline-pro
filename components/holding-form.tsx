"use client"

import { useState } from "react"

export function HoldingForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  )
  const [email, setEmail] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        setStatus("error")
        console.error(await res.text().catch(() => res.statusText))
        return
      }
      setStatus("done")
    } catch (err) {
      setStatus("error")
      console.error(err)
    }
  }

  if (status === "done") {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-6 py-5 text-center">
        <p className="font-semibold text-white">You&apos;re on the list.</p>
        <p className="mt-1 text-sm text-blue-100/60">We&apos;ll be in touch when we launch.</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder-blue-100/30 outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-lg gold-gradient-bg px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:whitespace-nowrap"
        >
          {status === "submitting" ? "..." : "Notify me"}
        </button>
      </form>
      {status === "error" ? (
        <p className="text-center text-sm text-red-400/90 sm:text-left">
          Something went wrong, try again
        </p>
      ) : null}
    </div>
  )
}
