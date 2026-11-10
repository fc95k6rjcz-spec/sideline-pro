import { afterEach, describe, expect, it, vi } from 'vitest'
import { measurementAllowed } from './marketing-events'
import { POST } from '../app/api/contact/route'
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('protected measurement preview', () => {
  it('allows only the exact assigned preview hostname', () => {
    const c = {enabled:true,hostname:'sideline-preview.vercel.app',previewHost:'sideline-preview.vercel.app',pathname:'/',cookies:'sp_measurement_consent=v1'}
    expect(measurementAllowed(c)).toBe(true)
    expect(measurementAllowed({...c,hostname:'other.vercel.app'})).toBe(false)
    expect(measurementAllowed({...c,hostname:'attacker.example',previewHost:'attacker.example'})).toBe(false)
    expect(measurementAllowed({...c,pathname:'/admin'})).toBe(false)
  })
  it('validates but never emails or stores preview enquiries', async () => {
    vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('VERCEL_GIT_COMMIT_REF','preview/measurement-20261110')
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
    const response=await POST(new Request('https://preview.example/api/contact',{method:'POST',body:JSON.stringify({email:'test@example.com',name:'Preview Test'})}))
    expect(await response.json()).toEqual({success:true,simulated:true})
    expect(fetch).not.toHaveBeenCalled()
    const invalid=await POST(new Request('https://preview.example/api/contact',{method:'POST',body:JSON.stringify({email:'invalid'})}))
    expect(invalid.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('production release safety', () => {
  it('uses the real delivery path in production, never preview simulation', async () => {
    vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_GIT_COMMIT_REF','preview/measurement-20261110')
    vi.stubEnv('SUPABASE_URL','https://synthetic.invalid');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','unit-test-only');vi.stubEnv('RESEND_API_KEY','')
    const fetch=vi.fn().mockResolvedValue({ok:true});vi.stubGlobal('fetch',fetch)
    const response=await POST(new Request('https://www.sidelinepro.com.au/api/contact',{method:'POST',body:JSON.stringify({email:'test@example.com'})}))
    expect(await response.json()).toEqual({success:true})
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
