import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { analyticsStorage, publicPaths, type Visit } from '@/lib/site-analytics'

export const runtime = 'nodejs'
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin || req.headers.get('sec-fetch-site') === 'cross-site') return new NextResponse(null, { status: 403 })
  if (req.cookies.get('sp_analytics_consent')?.value !== 'yes' || req.headers.get('sec-gpc') === '1' || req.headers.get('dnt') === '1') return new NextResponse(null, { status: 204 })
  if (Number(req.headers.get('content-length') ?? 0) > 2048) return new NextResponse(null, { status: 413 })
  try {
    const raw = await req.text()
    if (raw.length > 2048) return new NextResponse(null, { status: 413 })
    const body = JSON.parse(raw)
    const visitor = req.cookies.get('sp_visitor')?.value ?? ''
    if (!publicPaths.includes(body.path) || !/^[a-f0-9-]{36}$/.test(visitor)) return new NextResponse(null, { status: 400 })
    const ua = req.headers.get('user-agent') ?? ''
    if (/bot|crawler|spider|headless/i.test(ua)) return new NextResponse(null, { status: 204 })
    const address = process.env.VERCEL ? (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() : ''
    const ip = isIP(address) ? address : 'Unavailable'
    let source = 'Direct / unknown'
    if (typeof body.referrer === 'string' && body.referrer) {
      try { const url = new URL(body.referrer); if (['http:', 'https:'].includes(url.protocol)) source = url.hostname.slice(0, 150) } catch { /* Invalid referrers are ignored. */ }
    }
    const decode = (value: string | null) => { try { return decodeURIComponent(value ?? '').slice(0, 80) } catch { return '' } }
    const now = Date.now()
    const visit: Visit = { at: new Date(now).toISOString(), path: body.path, visitor, ip, country: decode(req.headers.get('x-vercel-ip-country')), city: decode(req.headers.get('x-vercel-ip-city')), source, device: /mobile|android|iphone/i.test(ua) ? 'Mobile' : /ipad|tablet/i.test(ua) ? 'Tablet' : 'Desktop' }
    // At most one view per IP/path per 30 seconds. HMAC avoids exposing IPs in filenames.
    const slot = Math.floor(now / 30000) * 30000
    const key = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${ip}:${body.path}:${slot}`).digest('hex').slice(0, 32)
    const bucket = await analyticsStorage()
    const { error } = await bucket.upload(`${slot}-${key}.json`, JSON.stringify(visit), { contentType: 'application/json', upsert: false })
    if (error && !/already exists|duplicate/i.test(error.message)) throw error
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Analytics unavailable' }, { status: 503 })
  }
}
