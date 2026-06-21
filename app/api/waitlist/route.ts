/*
 * Run in Supabase SQL editor (or migration) before enabling storage:
 *
 * CREATE TABLE IF NOT EXISTS public.waitlist (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email text NOT NULL UNIQUE,
 *   source text DEFAULT 'holding-page',
 *   created_at timestamptz DEFAULT now()
 * );
 */

import { NextResponse } from "next/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase()
}

async function storeWaitlistEmail(email: string) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    const base = supabaseUrl.replace(/\/$/, "")
    const res = await fetch(`${base}/rest/v1/waitlist?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email,
        source: "holding-page",
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`Supabase waitlist insert failed: ${res.status} ${detail}`)
    }
    return
  }

  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN

  if (kvUrl && kvToken) {
    const base = kvUrl.replace(/\/$/, "")
    const payload = JSON.stringify({
      email,
      source: "holding-page",
      at: new Date().toISOString(),
    })
    const res = await fetch(base, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["LPUSH", "waitlist:signups", payload]),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`KV waitlist write failed: ${res.status} ${detail}`)
    }
    return
  }

  console.log("[waitlist] signup (no DB/KV configured):", email)
}

async function notifyWaitlistSignup(email: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Sideline Pro <onboarding@resend.dev>"

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        // TODO: Switch back to rowan@sidelinepro.com.au once Cloudflare Email Routing
        // (or similar) forwards that address to the right inbox.
        to: ["jpcaruana@me.com"],
        subject: `New waitlist signup: ${email}`,
        text: `${email} just joined the Sideline Pro waitlist via the holding page.`,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error("[waitlist] Resend error:", res.status, detail)
    }
  } catch (err) {
    console.error("[waitlist] Resend request failed:", err)
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const emailRaw =
    body && typeof body === "object" && "email" in body
      ? (body as { email: unknown }).email
      : undefined

  if (typeof emailRaw !== "string") {
    return NextResponse.json({ error: "Expected { email: string }" }, { status: 400 })
  }

  const email = normalizeEmail(emailRaw)
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  try {
    await storeWaitlistEmail(email)
  } catch (err) {
    console.error("[waitlist] storage error:", err)
    return NextResponse.json({ error: "Could not save signup" }, { status: 500 })
  }

  await notifyWaitlistSignup(email)

  return NextResponse.json({ ok: true })
}
