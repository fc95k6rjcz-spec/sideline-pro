import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { sendMail, close, createTransport } = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport } }))
import { POST } from './route'
const submit = (body: unknown) => POST(new Request('https://example.invalid/api/contact', { method: 'POST', body: JSON.stringify(body) }))
beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'test')
  vi.stubEnv('SUPABASE_URL', 'https://database.invalid')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic')
  vi.stubEnv('GMAIL_USER', 'sender@example.invalid')
  vi.stubEnv('GMAIL_APP_PASS', 'synthetic')
  vi.stubEnv('CONTACT_NOTIFY_EMAIL', 'staff@example.invalid,other@example.invalid')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  createTransport.mockReturnValue({ sendMail, close })
  sendMail.mockResolvedValue({ accepted: ['staff@example.invalid', 'other@example.invalid'] })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('contact capture and Gmail notification', () => {
  it('normalizes, saves, and sends text to configured staff with lead reply-to', async () => {
    expect((await submit({ email: ' Lead@Example.com ', club: ' Club ', message: '<b>Hello</b>' })).status).toBe(200)
    expect(fetch).toHaveBeenCalledWith('https://database.invalid/rest/v1/demo_requests', expect.objectContaining({ body: expect.stringContaining('"email":"lead@example.com"') }))
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ service: 'gmail', auth: { user: 'sender@example.invalid', pass: 'synthetic' } }))
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['staff@example.invalid', 'other@example.invalid'], replyTo: 'lead@example.com', subject: 'New demo request: Club', text: expect.stringContaining('<b>Hello</b>') }))
    expect(close).toHaveBeenCalled()
  })
  it('uses the existing founder defaults', async () => {
    delete process.env.CONTACT_NOTIFY_EMAIL
    sendMail.mockResolvedValue({ accepted: ['justin@sidelinepro.com.au', 'rowan@sidelinepro.com.au'] })
    expect((await submit({ email: 'lead@example.com' })).status).toBe(200)
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ['justin@sidelinepro.com.au', 'rowan@sidelinepro.com.au'] }))
  })
  it.each([null, [], 42, {email: 4}, {email: 'bad'}, {email:'a@b.com',name:{}}, {email:'a@b.com',club:'bad\r\nBcc: x'}, {email:'a@b.com',message:'x'.repeat(10001)}])('rejects malformed fields before side effects: %j', async body => {
    expect((await submit(body)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled(); expect(sendMail).not.toHaveBeenCalled()
  })
  it('rejects invalid JSON and oversized bodies', async () => {
    expect((await POST(new Request('https://example.invalid', {method:'POST',body:'{'}))).status).toBe(400)
    expect((await submit({email:'a@b.com',message:'x'.repeat(17000)})).status).toBe(413)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps database capture when SMTP fails without logging lead or provider content', async () => {
    sendMail.mockRejectedValue(new Error('secret lead payload'))
    expect((await submit({email:'private@example.com'})).status).toBe(200)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private|secret lead/)
    expect(close).toHaveBeenCalled()
  })
  it('still emails when database fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('database down'))
    expect((await submit({email:'a@b.com'})).status).toBe(200)
    expect(sendMail).toHaveBeenCalledOnce()
  })
  it('fails if DB fails and SMTP rejects any recipient', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('private detail', {status:500}))
    sendMail.mockResolvedValue({accepted:['staff@example.invalid'],rejected:['other@example.invalid']})
    expect((await submit({email:'a@b.com'})).status).toBe(500)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private detail')
  })
  it('does not send with invalid recipient configuration', async () => {
    vi.stubEnv('CONTACT_NOTIFY_EMAIL', '')
    expect((await submit({email:'a@b.com'})).status).toBe(200)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
