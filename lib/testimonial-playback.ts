import { GA4_MEASUREMENT_ID, localMeasurementTest, marketingEnabled } from './marketing-config'
import { testimonialMeasurementAllowed } from './marketing-events'

const milestones = {
  testimonial_video_start: 0,
  testimonial_video_halfway: 50,
  testimonial_video_complete: 100,
} as const

export type TestimonialMilestone = keyof typeof milestones

/** Route directly through the existing GTM-loaded Google tag. No new tag,
 * loader, identifier, referrer, query parameter or video URL is collected. */
export function trackTestimonialPlayback(event: TestimonialMilestone): boolean {
  if (typeof window === 'undefined' || !Object.prototype.hasOwnProperty.call(milestones, event) ||
      !testimonialMeasurementAllowed({
        enabled: marketingEnabled(), localTest: localMeasurementTest(),
        previewHost: process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST,
        hostname: window.location.hostname, pathname: window.location.pathname,
        cookies: document.cookie, doNotTrack: navigator.doNotTrack,
        globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
      }) || !document.getElementById('sideline-marketing-gtm') || !window.dataLayer) return false
  // Google tag's command queue expects an Arguments object, not a GTM
  // Custom Event object. Restrict delivery to the existing GA4 destination.
  function command(..._args: unknown[]) { window.dataLayer!.push(arguments) }
  try {
    command('event', event, {
      send_to: GA4_MEASUREMENT_ID,
      page_path: '/', page_location: 'https://www.sidelinepro.com.au/', page_referrer: '',
      video_id: 'seaforth-homepage-16x9', video_percent: milestones[event],
      debug_mode: Boolean(process.env.NEXT_PUBLIC_MARKETING_PREVIEW_HOST),
    })
    return true
  } catch { return false }
}

/** One start per playback; pauses and buffering do not add starts.
 * A repeat after the video ends is a new playback. Seeking over the halfway
 * mark or straight to the end does not itself qualify as watching it. */
export function watchTestimonialPlayback(
  video: Pick<HTMLVideoElement, 'addEventListener' | 'removeEventListener' | 'currentTime' | 'duration' | 'seeking'>,
  emit: (event: TestimonialMilestone) => boolean,
): () => void {
  let started = false
  let halfway = false
  let previous: number | null = null
  let reachedEndAfterPlayback = false
  const reanchor = () => { previous = null; reachedEndAfterPlayback = false }
  const playing = () => {
    if (!started) started = emit('testimonial_video_start')
    previous = video.currentTime
  }
  const timeupdate = () => {
    if (!started || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return
    const current = video.currentTime
    if (previous !== null && current > previous) {
      if (!halfway && previous < video.duration / 2 && current >= video.duration / 2) {
        halfway = emit('testimonial_video_halfway')
      }
      if (current >= video.duration - 0.5) reachedEndAfterPlayback = true
    }
    previous = current
  }
  const ended = () => {
    if (started && reachedEndAfterPlayback) emit('testimonial_video_complete')
    started = false
    halfway = false
    reanchor()
  }
  const listeners = { playing, timeupdate, seeking: reanchor, seeked: reanchor, ended }
  for (const [type, listener] of Object.entries(listeners)) video.addEventListener(type, listener)
  return () => {
    for (const [type, listener] of Object.entries(listeners)) video.removeEventListener(type, listener)
  }
}
