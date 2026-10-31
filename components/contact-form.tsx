"use client"

import { useState } from "react"

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      club: formData.get("club"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      players: formData.get("players"),
      message: formData.get("message"),
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        setError("Your request could not be sent. Please try again or email rowan@sidelinepro.com.au.")
      }
    } catch {
      setError("We couldn’t connect. Please try again or email rowan@sidelinepro.com.au.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-[0_14px_38px_rgba(0,0,0,0.06)]">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[#eaf7f3]">
          <svg className="h-6 w-6 text-[#00796e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#0a1220]">Demo request received</h3>
        <p className="text-[#4a5568]">{"We'll be in touch within one business day."}</p>
      </div>
    )
  }

  return (
    <form method="post" action="/api/contact" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-bold text-[#0a1220]">
            Name
          </label>
          <input
            type="text"
            id="name"
            autoComplete="name"
            name="name"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="club" className="mb-2 block text-sm font-bold text-[#0a1220]">
            Club name
          </label>
          <input
            type="text"
            id="club"
            autoComplete="organization"
            name="club"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
            placeholder="Your club"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#0a1220]">
            Email
          </label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            name="email"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
            placeholder="you@club.com.au"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-bold text-[#0a1220]">
            Phone (optional)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
            placeholder="04XX XXX XXX"
            autoComplete="tel"
          />
        </div>
      </div>
      <div>
        <label htmlFor="players" className="mb-2 block text-sm font-bold text-[#0a1220]">
          Number of teams (optional)
        </label>
        <input
          type="text"
          id="players"
          name="players"
          className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
          placeholder="e.g. 20"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-bold text-[#0a1220]">
          What would you like to see? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full resize-none rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#0a1220] placeholder-[#6b7588] transition-colors focus:border-[#00bfae] focus:outline-none focus:ring-1 focus:ring-[#00bfae]/30"
          placeholder="Grading, umpire rostering, coaching, PlayHQ…"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-500">We’ll use these details to respond to your enquiry.</p>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded-full bg-[#00bfae] px-6 py-3 font-bold text-[#0a1220] transition-colors hover:bg-[#33ccbe] disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Book a demo"}
      </button>
    </form>
  )
}
