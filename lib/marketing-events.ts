/** Dormant until the reviewed consent UI and GTM container are activated.
 * Never send form fields, free text, identifiers, query strings or fragments.
 */
export const MEASUREMENT_CONSENT_COOKIE = 'sp_measurement_consent'
export const MEASUREMENT_CONSENT_VERSION = 'v1'
export const MARKETING_PATHS = ['/', '/grading', '/privacy'] as const
export type MarketingEvent = 'generate_lead' | 'contact_click' | 'demo_open'
export type MeasurementContext = {
  previewHost?: string
  localTest?: boolean
  enabled: boolean
  hostname: string
  pathname: string
  cookies: string
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}
export function measurementAllowed(context: MeasurementContext): boolean {
  return context.enabled && (context.hostname === 'www.sidelinepro.com.au' || (Boolean(context.previewHost) && context.hostname === context.previewHost && context.previewHost!.endsWith('.vercel.app')) || (context.localTest === true && ['localhost', '127.0.0.1'].includes(context.hostname)))
    && MARKETING_PATHS.includes(context.pathname as typeof MARKETING_PATHS[number])
    && context.doNotTrack !== '1' && context.globalPrivacyControl !== true
    && context.cookies.split(';').some(cookie => cookie.trim() === `${MEASUREMENT_CONSENT_COOKIE}=${MEASUREMENT_CONSENT_VERSION}`)
}
export function buildMarketingEvent(event: MarketingEvent, pathname: string) {
  if (!MARKETING_PATHS.includes(pathname as typeof MARKETING_PATHS[number])) return null
  // Allowlist both event names and payload values, including at runtime.
  if (event === 'generate_lead') return { event, lead_type: 'demo_request', form_id: 'club_demo', page_path: pathname }
  if (event === 'contact_click') return { event, contact_method: 'email', page_path: pathname }
  if (event === 'demo_open') return { event, page_path: pathname }
  return null
}
declare global {
  interface Window { dataLayer?: unknown[] }
}
export function trackMarketingEvent(event: MarketingEvent) {
  if (typeof window === 'undefined') return false
  const allowed = measurementAllowed({
    enabled: process.env.NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED === 'true',
    localTest: process.env.NEXT_PUBLIC_MARKETING_LOCAL_TEST === 'true',
    previewHost: process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    cookies: document.cookie,
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
  })
  const payload = buildMarketingEvent(event, window.location.pathname)
  if (!allowed || !payload) return false
  try {
    // A reviewed loader must initialize this; do not buffer pre-consent events.
    if (!window.dataLayer) return false
    window.dataLayer.push({ ...payload, debug_mode: Boolean(process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST), page_location: `https://www.sidelinepro.com.au${window.location.pathname}`, page_referrer: '' })
    return true
  } catch { return false } // Tracking must never interfere with the enquiry.
}
