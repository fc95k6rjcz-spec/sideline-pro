import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { upload } = vi.hoisted(() => ({ upload: vi.fn().mockResolvedValue({ error: null }) }))
vi.mock('@/lib/site-analytics', () => ({ publicPaths: ['/', '/grading', '/privacy'], analyticsStorage: async () => ({ upload }) }))
import { POST } from '../app/api/site-analytics/route'

function request(body: object, extra: Record<string, string> = {}) {
  return new NextRequest('https://www.sidelinepro.com.au/api/site-analytics', { method: 'POST', headers: { origin: 'https://www.sidelinepro.com.au', cookie: 'sp_analytics_consent=yes; sp_visitor=00000000-0000-4000-8000-000000000001', ...extra }, body: JSON.stringify(body) })
}
beforeEach(() => { upload.mockClear(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key'); vi.stubEnv('VERCEL', '1') })
describe('consented website analytics', () => {
  it('does not write without consent or with GPC', async () => {
    expect((await POST(request({ path: '/' }, { cookie: '' }))).status).toBe(204)
    expect((await POST(request({ path: '/' }, { 'sec-gpc': '1' }))).status).toBe(204)
    expect(upload).not.toHaveBeenCalled()
  })
  it('rejects cross-origin and private page submissions', async () => {
    expect((await POST(request({ path: '/' }, { origin: 'https://other.example' }))).status).toBe(403)
    expect((await POST(request({ path: '/admin/invoice' }))).status).toBe(400)
    expect(upload).not.toHaveBeenCalled()
  })
  it('stores only the referrer hostname, with a non-identifying filename', async () => {
    expect((await POST(request({ path: '/grading', referrer: 'https://example.com/private?email=secret@example.com' }, { 'x-forwarded-for': '192.0.2.1', 'x-vercel-ip-city': 'Sydney' }))).status).toBe(204)
    const [name, body] = upload.mock.calls[0]
    expect(name).not.toContain('192.0.2.1')
    expect(JSON.parse(body)).toMatchObject({ source: 'example.com', city: 'Sydney', ip: '192.0.2.1' })
    expect(body).not.toContain('secret@example.com')
  })
})
