import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { z } from "zod"

const singleLine = (max: number) => z.string().trim().max(max).refine(value => !/[\r\n\0]/.test(value))
const leadSchema = z.object({
  name: singleLine(200).optional(),
  club: singleLine(200).optional(),
  email: z.string().trim().max(254).email().transform(value => value.toLowerCase()),
  phone: singleLine(100).optional(),
  players: singleLine(100).optional(),
  message: z.string().trim().max(10000).refine(value => !value.includes("\0")).optional(),
})
type Lead = z.infer<typeof leadSchema>

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
    signal: AbortSignal.timeout(10000),
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
    throw new Error(`Supabase insert failed: ${res.status}`)
  }
  return true
}

// Email the team so the lead lands in an inbox immediately.
async function notifyTeam(lead: Lead) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASS
  if (!user || !pass) {
    console.warn("[contact] Gmail not configured — notification unavailable")
    return false
  }
  // CONTACT_NOTIFY_EMAIL can be a single address or a comma-separated list.
  // Default goes to both founders so demo requests aren't a single-point-of-failure.
  const to = (process.env.CONTACT_NOTIFY_EMAIL ?? "justin@sidelinepro.com.au,rowan@sidelinepro.com.au")
    .split(",")
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0)
  const lines = [
    `Name:    ${lead.name ?? "—"}`,
    `Club:    ${lead.club ?? "—"}`,
    `Email:   ${lead.email ?? "—"}`,
    `Phone:   ${lead.phone ?? "—"}`,
    `Teams:   ${lead.players ?? "—"}`,
    ``,
    `Message:`,
    lead.message ?? "—",
  ].join("\n")

  if (!to.length || to.some(address => !z.string().email().safeParse(address).success)) {
    console.error("[contact] Invalid notification recipient configuration")
    return false
  }
  // Match the approved invoice mailer; keep the configured sender identity.
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
  try {
    const result = await transport.sendMail({
      from: { name: process.env.GMAIL_FROM_NAME ?? "Sideline Pro", address: user },
      to,
      replyTo: lead.email,
      subject: `New demo request: ${lead.club || lead.name || "Sideline Pro"}`,
      text: lines,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    const delivered = to.every(address => result.accepted?.some(accepted =>
      (typeof accepted === "string" ? accepted : accepted.address).toLowerCase() === address.toLowerCase()))
    if (!delivered) console.error("[contact] Notification not accepted for every recipient")
    return delivered
  } finally {
    transport.close()
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).length > 16384) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 })
    }
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact details" }, { status: 400 })
  }
  const lead = parsed.data
  // The approved protected preview must never send email or write real leads.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "preview/measurement-20261110") {
    return NextResponse.json({ success: true, simulated: true })
  }


  // Try both; the request only fails if NOTHING captured the lead.
  let saved = false
  let emailed = false
  try { saved = await storeLead(lead) } catch { console.error("[contact] Database capture failed") }
  try { emailed = await notifyTeam(lead) } catch { console.error("[contact] Gmail notification failed") }

  if (!saved && !emailed) {
    console.error("[contact] Capture and notification both failed")
    return NextResponse.json({ error: "Could not deliver request" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
