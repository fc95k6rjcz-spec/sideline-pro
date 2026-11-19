import { afterEach, describe, expect, it, vi } from 'vitest'
import { measurementAllowed, testimonialMeasurementAllowed } from './marketing-events'
import { trackTestimonialPlayback, watchTestimonialPlayback } from './testimonial-playback'

class Video extends EventTarget {
  currentTime = 0
  duration = 80
  seeking = false
  event(type: string, at = this.currentTime) {
    this.currentTime = at
    this.dispatchEvent(new Event(type))
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('optional testimonial tracking', () => {
  const context = { enabled: true, hostname: 'www.sidelinepro.com.au', pathname: '/', cookies: 'sp_measurement_consent=v2' }
  it('retains legacy consent for other events without granting video collection', () => {
    const legacy = { ...context, cookies: 'sp_measurement_consent=v1' }
    expect(measurementAllowed(legacy)).toBe(true)
    expect(testimonialMeasurementAllowed(legacy)).toBe(false)
    expect(testimonialMeasurementAllowed(context)).toBe(true)
  })
  it.each([{ pathname: '/grading' }, { cookies: '' }, { cookies: 'sp_measurement_consent=no' }, { enabled: false }, { hostname: 'unknown.example' }, { doNotTrack: '1' }, { globalPrivacyControl: true }])(
    'declines tracking for %o', overrides => { expect(testimonialMeasurementAllowed({ ...context, ...overrides })).toBe(false) }
  )
  it('queues only the fixed, homepage-only Google tag command and rechecks withdrawal, DNT and GPC', () => {
    vi.stubEnv('NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED', 'true')
    const dataLayer: unknown[] = []
    const doc = { cookie: 'sp_measurement_consent=v2', getElementById: vi.fn(() => ({})) }
    const nav = { doNotTrack: '', globalPrivacyControl: false }
    vi.stubGlobal('window', { dataLayer, location: { hostname: context.hostname, pathname: '/', search: '?email=private' } })
    vi.stubGlobal('document', doc)
    vi.stubGlobal('navigator', nav)
    expect(trackTestimonialPlayback('testimonial_video_start')).toBe(true)
    expect(Object.prototype.toString.call(dataLayer[0])).toBe('[object Arguments]')
    expect(Array.from(dataLayer[0] as IArguments)).toEqual(['event', 'testimonial_video_start', {
      send_to: 'G-9LYKC3YCBD', page_path: '/', page_location: 'https://www.sidelinepro.com.au/', page_referrer: '',
      video_id: 'seaforth-homepage-16x9', video_percent: 0, debug_mode: false,
    }])
    expect(trackTestimonialPlayback('constructor' as never)).toBe(false)
    nav.doNotTrack = '1'
    expect(trackTestimonialPlayback('testimonial_video_halfway')).toBe(false)
    nav.doNotTrack = ''
    nav.globalPrivacyControl = true
    expect(trackTestimonialPlayback('testimonial_video_halfway')).toBe(false)
    nav.globalPrivacyControl = false
    doc.cookie = 'sp_measurement_consent=v1'
    expect(trackTestimonialPlayback('testimonial_video_complete')).toBe(false)
    doc.cookie = 'sp_measurement_consent=v2'
    doc.getElementById.mockReturnValueOnce(null as never)
    expect(trackTestimonialPlayback('testimonial_video_complete')).toBe(false)
    expect(dataLayer).toHaveLength(1)
  })
})

describe('actual playback milestones', () => {
  it('deduplicates pauses/buffering, tracks progress and finish, then counts replay', () => {
    const video = new Video()
    const emit = vi.fn(() => true)
    const detach = watchTestimonialPlayback(video, emit)
    video.event('playing')
    video.event('timeupdate', 10)
    video.event('pause')
    video.event('playing')
    video.event('timeupdate', 39.95)
    video.event('timeupdate', 40.1)
    video.event('timeupdate', 79.8)
    video.event('timeupdate', 80)
    video.event('ended')
    video.event('playing', 0)
    expect(emit.mock.calls.flat()).toEqual(['testimonial_video_start', 'testimonial_video_halfway', 'testimonial_video_complete', 'testimonial_video_start'])
    detach()
    video.event('timeupdate', 80)
    video.event('ended')
    expect(emit).toHaveBeenCalledTimes(4)
  })
  it('ignores jumps across halfway and seek to end, and never measures progress without a start', () => {
    const video = new Video()
    const emit = vi.fn(() => true)
    watchTestimonialPlayback(video, emit)
    video.event('timeupdate', 20)
    video.event('playing')
    video.seeking = true
    video.event('seeking', 62)
    video.event('timeupdate', 62)
    video.seeking = false
    video.event('seeked')
    video.event('timeupdate', 63)
    video.event('seeking', 80)
    video.event('seeked')
    video.event('timeupdate')
    video.event('ended')
    expect(emit.mock.calls.flat()).toEqual(['testimonial_video_start'])
  })
})
