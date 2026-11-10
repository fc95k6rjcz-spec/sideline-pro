import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadMarketingContainer } from './marketing-loader'
const context = {enabled:true, hostname:'www.sidelinepro.com.au',pathname:'/',cookies:'sp_measurement_consent=v1'}
afterEach(() => vi.unstubAllGlobals())
function browser(existing = false) {
  const appendChild = vi.fn()
  vi.stubGlobal('window', {})
  vi.stubGlobal('document', {getElementById: () => existing ? {} : null, querySelector: () => null, createElement: () => ({}), head: {appendChild}})
  return appendChild
}
describe('dormant GTM loader', () => {
  it('loads no script without current consent or with privacy signals', () => {
    const append = browser()
    for (const patch of [{cookies:''},{enabled:false},{doNotTrack:'1'},{globalPrivacyControl:true},{pathname:'/admin'}]) expect(loadMarketingContainer({...context,...patch},'GTM-EXAMPLE')).toBe(false)
    expect(append).not.toHaveBeenCalled()
  })
  it('rejects invalid IDs and duplicate loaders', () => {
    const append = browser(true)
    expect(loadMarketingContainer(context,'GTM-EXAMPLE')).toBe(false)
    expect(append).not.toHaveBeenCalled()
    browser()
    expect(loadMarketingContainer(context,'G-12345')).toBe(false)
    expect(loadMarketingContainer(context,'GTM-ABC&extra=1')).toBe(false)
  })
  it('initializes consent before the only container request', () => {
    const append=browser()
    expect(loadMarketingContainer(context,'GTM-EXAMPLE')).toBe(true)
    expect(append).toHaveBeenCalledTimes(1)
    expect(append.mock.calls[0][0]).toMatchObject({id:'sideline-marketing-gtm',async:true,src:'https://www.googletagmanager.com/gtm.js?id=GTM-EXAMPLE'})
    const queue = window.dataLayer!
    expect(Array.from(queue[0] as ArrayLike<unknown>)).toEqual(['consent','default', {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}])
    expect(Array.from(queue[1] as ArrayLike<unknown>)).toEqual(['consent','update',{analytics_storage:'granted'}])
    expect(queue[2]).toMatchObject({event:'gtm.js'})
  })
})
