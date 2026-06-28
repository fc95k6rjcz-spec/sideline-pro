"use client"

import { useState } from "react"

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

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
      }
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-[0_14px_38px_rgba(0,0,0,0.06)]">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[#f5f5f7]">
          <svg className="h-6 w-6 text-[#1B7A47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-bold text-[#1d1d1f]">Thank you!</h3>
        <p className="text-[#6e6e73]">{"We'll be in touch within one business day."}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="club" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
            Club name
          </label>
          <input
            type="text"
            id="club"
            name="club"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
            placeholder="Your club"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
            placeholder="you@club.com.au"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
            placeholder="04XX XXX XXX"
          />
        </div>
      </div>
      <div>
        <label htmlFor="players" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
          Approx. number of registered players
        </label>
        <input
          type="text"
          id="players"
          name="players"
          className="w-full rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
          placeholder="e.g. 250"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-[#1d1d1f]">
          What are you hoping to solve?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full resize-none rounded-[10px] border border-black/15 bg-white px-4 py-3 text-[#1d1d1f] placeholder-[#86868b] transition-colors focus:border-[#BD8A2C] focus:outline-none focus:ring-1 focus:ring-[#BD8A2C]/30"
          placeholder="Tell us about your club's biggest challenges..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded-full bg-[#BD8A2C] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Get my club's pricing"}
      </button>
    </form>
  )
}
