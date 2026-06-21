import { NextResponse } from "next/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Lead = {
  name?: string
  club?: string
  email?: string
  phone?: string
  players?: string
  message?: string
}

// Save the lead to Supabase (demo_requests table) using the service-role key.
// Best-effort: never blocks the email path.
async function storeLead(lead: Lead) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn("[contact] SUPABASE env not set — lead not saved to DB")
    return false
  }
  const base = url.replace(/\/$/, "")
  const res = await fetch(`${base}/rest/v1/demo_requests`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      name: lead.name ?? null,
      club: lead.club ?? null,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      players: lead.players ?? null,
      message: lead.message ?? null,
      source: "website",
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Supabase insert failed: ${res.status} ${detail}`)
  }
  return true
}

// Email the team so the lead lands in an inbox immediately.
async function notifyTeam(lead: Lead) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set — no email sent")
    return false
  }
  const from = process.env.RESEND_FROM_EMAIL ?? "Sideline Pro <onboarding@resend.dev>"
  const to = process.env.CONTACT_NOTIFY_EMAIL ?? "jpcaruana@me.com"
  const lines = [
    `Name:    ${lead.name ?? "—"}`,
    `Club:    ${lead.club ?? "—"}`,
    `Email:   ${lead.email ?? "—"}`,
    `Phone:   ${lead.phone ?? "—"}`,
    `Players: ${lead.players ?? "—"}`,
    ``,
    `Message:`,
    lead.message ?? "—",
  ].join("\n")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: lead.email,
      subject: `New demo request: ${lead.club ?? lead.name ?? "Sideline Pro"}`,
      text: lines,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    console.error("[contact] Resend error:", res.status, detail)
    return false
  }
  return true
}

export async function POST(request: Request) {
  let lead: Lead
  try {
    lead = (await request.json()) as Lead
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = (lead.email ?? "").trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  lead.email = email

  // Try both; the request only fails if NOTHING captured the lead.
  let saved = false
  let emailed = false
  try { saved = await storeLead(lead) } catch (e) { console.error("[contact] save error:", e) }
  try { emailed = await notifyTeam(lead) } catch (e) { console.error("[contact] email error:", e) }

  if (!saved && !emailed) {
    console.error("[contact] LEAD LOST — no DB and no email configured:", lead)
    return NextResponse.json({ error: "Could not deliver request" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
