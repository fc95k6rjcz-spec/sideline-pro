import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMarketingEvent, measurementAllowed, trackMarketingEvent } from '../lib/marketing-events.ts'
const good = { enabled: true, hostname: 'www.sidelinepro.com.au', pathname: '/', cookies: 'sp_measurement_consent=v1' }
test('requires explicit new consent, public production host and enabled flag', () => {
  assert.equal(measurementAllowed(good), true)
  for (const change of [{enabled:false},{hostname:'localhost'},{hostname:'preview.vercel.app'},{pathname:'/admin'},{pathname:'/proposal/secret'},{cookies:''},{cookies:'sp_analytics_consent=yes'},{cookies:'sp_measurement_consent=old'},{doNotTrack:'1'},{globalPrivacyControl:true}]) {
    assert.equal(measurementAllowed({...good,...change}),false)
  }
})
test('only fixed non-personal event fields are emitted', () => {
  assert.deepEqual(buildMarketingEvent('generate_lead','/'), {event:'generate_lead',lead_type:'demo_request',form_id:'club_demo',page_path:'/'})
  assert.deepEqual(buildMarketingEvent('contact_click','/grading'), {event:'contact_click',contact_method:'email',page_path:'/grading'})
  assert.equal(buildMarketingEvent('generate_lead','/?email=private@example.com'),null)
  assert.equal(buildMarketingEvent('unknown','/'),null)
  assert.equal(buildMarketingEvent('generate_lead','/proposal/token'),null)
})
test('server-side calls are safely ignored', () => assert.equal(trackMarketingEvent('generate_lead'),false))
test('browser events are gated and tracking errors cannot break forms', () => {
  const events=[]
  globalThis.window={location:{hostname:good.hostname,pathname:'/'},dataLayer:events}
  globalThis.document={cookie:good.cookies}
  process.env.NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED='false'
  assert.equal(trackMarketingEvent('generate_lead'),false)
  assert.equal(events.length,0)
  process.env.NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED='true'
  assert.equal(trackMarketingEvent('generate_lead'),true)
  assert.equal(events.length,1)
  document.cookie='sp_analytics_consent=yes'
  assert.equal(trackMarketingEvent('generate_lead'),false)
  document.cookie=good.cookies
  window.dataLayer={push(){throw new Error('blocked')}}
  assert.equal(trackMarketingEvent('generate_lead'),false)
  delete globalThis.window; delete globalThis.document
  delete process.env.NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED
})
