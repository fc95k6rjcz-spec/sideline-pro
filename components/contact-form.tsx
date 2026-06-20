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
      <div className="rounded-lg border border-[#2F3440] bg-[#1B1F2A] p-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#2F3440] bg-[#222733]">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">Thank you!</h3>
        <p className="text-[#9CA3AF]">{"We'll be in touch within one business day."}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="club" className="mb-2 block text-sm font-medium text-white">
            Club name
          </label>
          <input
            type="text"
            id="club"
            name="club"
            required
            className="w-full rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
            placeholder="Your club"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
            placeholder="you@club.com.au"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-white">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="w-full rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
            placeholder="04XX XXX XXX"
          />
        </div>
      </div>
      <div>
        <label htmlFor="players" className="mb-2 block text-sm font-medium text-white">
          Approx. number of registered players
        </label>
        <input
          type="text"
          id="players"
          name="players"
          className="w-full rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
          placeholder="e.g. 250"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-white">
          What are you hoping to solve?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full resize-none rounded-lg border border-[#2F3440] bg-[#1B1F2A] px-4 py-3 text-white placeholder-[#666666] transition-colors focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/20"
          placeholder="Tell us about your club's biggest challenges..."
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded-lg bg-[#E0A82E] px-6 py-3 font-semibold text-black transition-colors hover:bg-[#EFBC4A] disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Get my club's pricing"}
      </button>
    </form>
  )
}
