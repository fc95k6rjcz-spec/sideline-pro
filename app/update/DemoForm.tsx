"use client"

import { useState } from "react"

const input =
  "w-full rounded-[10px] border border-[#001025]/10 bg-[#f3f7f8] px-[14px] py-[13px] text-[15px] text-[#001025] placeholder-[#7b8aa0] transition-colors focus:border-[#00BFAE] focus:outline-none focus:ring-2 focus:ring-[#00BFAE]/30"
const label = "flex flex-col gap-1.5"
const labelText = "text-[13px] font-semibold text-[#4c5b6d]"

/**
 * "Book my demo" card from the Live redesign. Posts to the existing
 * /api/contact route (Supabase demo_requests + Resend email). `teams`
 * is sent as `players`, which is what the route and table already use.
 */
export function DemoForm({ displayFont }: { displayFont: React.CSSProperties }) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      name: fd.get("name"),
      club: fd.get("club"),
      email: fd.get("email"),
      players: fd.get("teams"),
      message: fd.get("message"),
    }
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setDone(true)
      } else {
        setError("That didn't send. Try again, or email rowan@sidelinepro.com.au.")
      }
    } catch {
      setError("That didn't send. Try again, or email rowan@sidelinepro.com.au.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-[22px] bg-white px-9 py-11 text-[#001025]">
        <p className="text-[56px] font-extrabold uppercase leading-none" style={displayFont}>
          You&rsquo;re in.
        </p>
        <p className="mt-3 text-[16px] leading-[1.55] text-[#4c5b6d]">
          Rowan will be in touch within one business day with a time that suits.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-[22px] bg-white p-6 text-[#001025] sm:grid-cols-2 sm:p-8"
    >
      <label className={label}>
        <span className={labelText}>Your name</span>
        <input name="name" type="text" required placeholder="First and last" className={input} />
      </label>
      <label className={label}>
        <span className={labelText}>Club</span>
        <input name="club" type="text" required placeholder="e.g. Harbour United FC" className={input} />
      </label>
      <label className={label}>
        <span className={labelText}>Email</span>
        <input name="email" type="email" required placeholder="you@club.com.au" className={input} />
      </label>
      <label className={label}>
        <span className={labelText}>Teams</span>
        <input name="teams" type="text" placeholder="e.g. 24" className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        <span className={labelText}>What eats your committee&rsquo;s weekends?</span>
        <textarea
          name="message"
          rows={3}
          placeholder="e.g. umpire rostering takes our whole Sunday"
          className={`${input} resize-y`}
        />
      </label>
      {error && <p className="text-[14px] font-medium text-[#b42318] sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[#00BFAE] p-4 text-[17px] font-bold text-[#001025] transition-transform hover:scale-[1.02] disabled:opacity-60 sm:col-span-2"
      >
        {submitting ? "Sending…" : "Book my demo"}
      </button>
    </form>
  )
}
