import { measurementAllowed, type MeasurementContext } from './marketing-events'

/** Consent-gated loader. Activate only after account/consent review.
 * GTM owns GA4 and Clarity; never add parallel direct vendor snippets.
 */
export function loadMarketingContainer(context: MeasurementContext, containerId: string): boolean {
  if (typeof window === 'undefined' || !measurementAllowed(context) || !/^GTM-[A-Z0-9]+$/.test(containerId)) return false
  if (document.getElementById('sideline-marketing-gtm')) return false
  // Refuse a parallel container, including a pre-existing nonstandard loader.
  if (document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) return false
  window.dataLayer = window.dataLayer || []
  function consent(..._args: unknown[]) { window.dataLayer!.push(arguments) }
  consent('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  })
  consent('consent', 'update', { analytics_storage: 'granted' })
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.id = 'sideline-marketing-gtm'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`
  document.head.appendChild(script)
  return true
}
