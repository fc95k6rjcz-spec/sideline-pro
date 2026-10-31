'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const pages = ['/', '/grading', '/privacy']
const cookie = (name: string) => document.cookie.split('; ').find(v => v.startsWith(name + '='))?.split('=')[1]
const setCookie = (name: string, value: string, age = 2592000) => { document.cookie = `${name}=${value}; Path=/; Max-Age=${age}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}` }

export function VisitorAnalytics() {
  const path = usePathname()
  const [choice, setChoice] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const blocked = navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    setChoice(blocked ? 'no' : cookie('sp_analytics_consent') ?? null)
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready || choice !== 'yes' || !pages.includes(path)) return
    if (!cookie('sp_visitor')) setCookie('sp_visitor', crypto.randomUUID())
    void fetch('/api/site-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, referrer: document.referrer }), keepalive: true }).catch(() => {})
  }, [path, choice, ready])
  if (!ready || !pages.includes(path)) return null
  function choose(value: string) {
    setCookie('sp_analytics_consent', value)
    if (value === 'no') setCookie('sp_visitor', '', 0)
    setChoice(value); setOpen(false)
  }
  return <>{choice !== null && !open ? <button onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-50 rounded-full border border-white/20 bg-[#0A1220] px-3 py-2 text-xs text-white">Privacy choices</button> : <aside aria-label="Optional site analytics" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-2xl border border-[#00BFAE]/30 bg-[#0A1220] p-5 text-sm text-white shadow-xl"><strong>Help us understand how the site is used?</strong><p className="my-2 text-xs leading-relaxed text-slate-300">With your permission, we record pages visited, referral website, IP address and approximate city, using a 30-day visitor cookie. We don’t know your name from this. <a className="underline" href="/privacy">Analytics privacy details</a></p><div className="flex flex-wrap gap-3"><button className="rounded-lg border border-white/40 px-4 py-2" onClick={() => choose('no')}>Decline analytics</button><button className="rounded-lg border border-[#00BFAE] bg-[#00BFAE] px-4 py-2 font-bold text-[#0A1220]" onClick={() => choose('yes')}>Allow analytics</button></div></aside>}</>
}
