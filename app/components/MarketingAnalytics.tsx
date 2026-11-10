'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { GTM_CONTAINER_ID, localMeasurementTest, marketingEnabled } from '@/lib/marketing-config'
import { measurementAllowed, trackMarketingEvent } from '@/lib/marketing-events'
import { loadMarketingContainer } from '@/lib/marketing-loader'

export function MarketingAnalytics({ consent }: { consent: string | null }) {
  const path = usePathname()
  const sent = useRef<string | null>(null)
  useEffect(() => {
    const context = {
      enabled: marketingEnabled(), localTest: localMeasurementTest(), hostname: location.hostname,
      pathname: path, previewHost: process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST, cookies: document.cookie, doNotTrack: navigator.doNotTrack,
      globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
    }
    if (!measurementAllowed(context)) return
    loadMarketingContainer(context, GTM_CONTAINER_ID)
    if (sent.current !== path) {
      let referrer = ''
      try { const ref = new URL(document.referrer); if (['https:', 'http:'].includes(ref.protocol)) referrer = ref.origin + '/' } catch { /* Empty/invalid referrer. */ }
      window.dataLayer?.push({event:'sp_page_view', debug_mode:Boolean(process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST), page_path:path, page_location:`https://www.sidelinepro.com.au${path}`, page_title:path === '/' ? 'SidelinePro' : path === '/grading' ? 'Player grading & development' : 'Analytics privacy', page_referrer:referrer})
      sent.current = path
    }
    function click(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('mailto:')) trackMarketingEvent('contact_click')
      else {
        try {
          const url = new URL(href, location.href)
          if (url.origin === location.origin && (url.pathname === '/demo' || url.pathname.startsWith('/demo/'))) trackMarketingEvent('demo_open')
        } catch { /* Invalid links never enter analytics. */ }
      }
    }
    const interval = window.setInterval(() => {
      const valid = measurementAllowed({...context, cookies:document.cookie, doNotTrack:navigator.doNotTrack, globalPrivacyControl:(navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl})
      if (!valid) withdrawGoogleMeasurement()
    }, 1000)
    document.addEventListener('click', click)
    return () => { window.clearInterval(interval); document.removeEventListener('click', click) }
  }, [path, consent])
  return null
}

export function withdrawGoogleMeasurement() {
  if (typeof window === 'undefined') return
  // Stop queued Google collection before unloading loaded third-party scripts.
  function command(..._args: unknown[]) { window.dataLayer?.push(arguments) }
  command('consent', 'update', {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
  const domains = ['', location.hostname, '.sidelinepro.com.au']
  for (const item of document.cookie.split(';')) {
    const name = item.trim().split('=')[0]
    if (!/^(_ga($|_)|_gid$|_gat($|_))/.test(name)) continue
    for (const domain of domains) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${location.protocol === 'https:' ? '; Secure' : ''}`
  }
  // Consent withdrawal requires a full reload: removing a script tag is insufficient.
  if (document.getElementById('sideline-marketing-gtm')) location.reload()
}
