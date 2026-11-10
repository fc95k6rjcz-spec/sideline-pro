'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MarketingAnalytics, withdrawGoogleMeasurement } from './MarketingAnalytics'
import { marketingEnabled } from '@/lib/marketing-config'

const pages = ['/', '/grading', '/privacy']
const cookie = (name: string) => document.cookie.split('; ').find(v => v.startsWith(name + '='))?.split('=')[1]
const setCookie = (name: string, value: string, age = 2592000) => { document.cookie = `${name}=${value}; Path=/; Max-Age=${age}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` }
const privacySignal = () => navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true

export function VisitorAnalytics() {
  const path = usePathname()
  const [choice, setChoice] = useState<string | null>(null)
  const [google, setGoogle] = useState<string | null>(null)
  const [firstPartyDraft, setFirstPartyDraft] = useState(false)
  const [googleDraft, setGoogleDraft] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const enabled = marketingEnabled()
  useEffect(() => {
    const signal = privacySignal()
    const first = signal ? 'no' : cookie('sp_analytics_consent') ?? null
    const measurement = signal ? 'no' : cookie('sp_measurement_consent') ?? null
    setChoice(first); setGoogle(measurement); setBlocked(signal)
    setFirstPartyDraft(first === 'yes'); setGoogleDraft(measurement === 'v1'); setReady(true)
    if (signal) { setCookie('sp_visitor','',0); withdrawGoogleMeasurement() }
  }, [])
  useEffect(() => {
    if (!ready || choice !== 'yes' || privacySignal() || !pages.includes(path)) return
    if (!cookie('sp_visitor')) setCookie('sp_visitor', crypto.randomUUID())
    void fetch('/api/site-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, referrer: document.referrer }), keepalive: true }).catch(() => {})
  }, [path, choice, ready])
  if (!ready || !pages.includes(path)) return null
  function save(first: boolean, measurement: boolean) {
    const denied = privacySignal()
    first = first && !denied; measurement = measurement && !denied
    setCookie('sp_analytics_consent', first ? 'yes' : 'no')
    if (!first) setCookie('sp_visitor', '', 0)
    if (enabled) setCookie('sp_measurement_consent', measurement ? 'v1' : 'no')
    setChoice(first ? 'yes' : 'no'); setGoogle(measurement ? 'v1' : 'no')
    setFirstPartyDraft(first); setGoogleDraft(measurement); setOpen(false)
    if (enabled && !measurement) withdrawGoogleMeasurement()
  }
  const answered = choice !== null && (!enabled || google === 'v1' || google === 'no')
  return <>
    {enabled && <MarketingAnalytics consent={google}/>}
    {answered && !open ? <button onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-50 rounded-full border border-white/20 bg-[#0A1220] px-3 py-2 text-xs text-white">Privacy choices</button> : <aside aria-label="Optional site analytics" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-2xl border border-[#00BFAE]/30 bg-[#0A1220] p-5 text-sm text-white shadow-xl">
      <strong>Choose optional website analytics</strong>
      <p className="my-2 text-xs leading-relaxed text-slate-300">The website works without optional analytics. Change or withdraw your choices at any time. <a className="underline" href="/privacy">Analytics privacy details</a></p>
      {blocked && <p role="status" className="my-2">Your browser’s privacy signal disables optional analytics.</p>}
      <label className="my-3 flex items-start gap-2"><input type="checkbox" checked={firstPartyDraft} disabled={blocked} onChange={e => setFirstPartyDraft(e.target.checked)}/><span>Private website analytics: page visits, referral website, IP address and approximate city, stored in Supabase with a 30-day visitor cookie.</span></label>
      {enabled && <label className="my-3 flex items-start gap-2"><input type="checkbox" checked={googleDraft} disabled={blocked} onChange={e => setGoogleDraft(e.target.checked)}/><span>Google Analytics: send public page views and enquiry activity to Google via Tag Manager, using analytics cookies. No names, email addresses or form contents are included in our events. Google may process data outside Australia.</span></label>}
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg border border-white/40 px-4 py-2" onClick={() => save(false,false)}>Decline analytics</button>
        <button className="rounded-lg border border-white/40 px-4 py-2" onClick={() => save(firstPartyDraft,googleDraft)}>Save choices</button>
        {!blocked && <button className="rounded-lg border border-[#00BFAE] bg-[#00BFAE] px-4 py-2 font-bold text-[#0A1220]" onClick={() => save(true,enabled)}>Allow analytics</button>}
      </div>
    </aside>}
  </>
}
