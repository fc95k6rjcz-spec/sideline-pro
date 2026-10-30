"use client"

import { useRef, useState } from "react"
import { ArrowRight, Play } from "lucide-react"
import styles from "../home.module.css"

export function CoachReportVideo() {
  const video = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState(false)
  const [guideVisible, setGuideVisible] = useState(false)
  const updateGuide = () => {
    const time = video.current?.currentTime ?? 0
    setGuideVisible(time >= 3 && time < 19)
  }
  async function viewGuide() {
    if (!video.current) return
    const player = video.current
    if (player.readyState === 0) {
      player.addEventListener("loadedmetadata", () => { player.currentTime = 12; player.pause(); setStarted(true); updateGuide() }, { once: true })
      player.load()
    } else {
      player.currentTime = 12
      player.pause()
      setStarted(true)
      setGuideVisible(true)
    }
  }

  async function play() {
    if (!video.current) return
    if (video.current.ended) video.current.currentTime = 0
    try {
      await video.current.play()
      setError(false)
    } catch {
      setError(true)
    }
  }

  return <figure className={styles.coachVideo} aria-labelledby="coach-video-title">
    <div className={styles.coachVideoCopy}>
      <p className={styles.coachVideoEyebrow}>COACHING &amp; DEVELOPMENT · IN ACTION</p>
      <h4 id="coach-video-title">See how a coach report comes together.</h4>
      <p>From skill ratings to the context behind them. Watch the real app bring coaching observations, preferred positions and development notes into one report.</p>
      <button type="button" onClick={play} className={styles.coachVideoPlay}><Play size={18} fill="currentColor"/> {started ? "Continue the walkthrough" : "Play the walkthrough"}<span>40 sec · silent</span></button>
      <button type="button" onClick={viewGuide} className={styles.coachGuideJump}>View the competency guide at 0:12 <ArrowRight size={14}/></button>
      <aside className={styles.coachSourceCallout} data-visible={guideVisible} aria-label="Source of the competency guidance">
        <span className={styles.coachSourceArrow} aria-hidden="true"><ArrowRight size={40} strokeWidth={1.4}/></span>
        <p className={styles.coachSourceLabel}>WHERE THE SKILL GUIDANCE COMES FROM</p>
        <h5>Informed by Netball Australia.</h5>
        <p>Our skill descriptions draw on the <strong>Netball Skills Development Framework</strong>. SidelinePro adapts that guidance into a clear 1–5 matrix, relative to the player’s grade.</p>
        <a href="https://netball.com.au/sites/default/files/2019-06/NetballSkillsDevelopmentFramework_UpdatedFINAL_Sept2018.pdf#page=2" target="_blank" rel="noopener noreferrer">View the source framework (PDF) <ArrowRight size={14}/></a>
      </aside>
      {error && <p role="status">Use the video’s play control to start the walkthrough.</p>}
      <figcaption id="coach-report-description">Actual interface · fictional demo players</figcaption>
      <details><summary>What the walkthrough shows</summary><p>Eight skill ratings and their guidance, preferred positions, coaching context, next-season intent, strengths, development fields and notes. The recording ends at the Save and Save &amp; next controls.</p></details>
    </div>
    <div className={styles.coachVideoPlayer}>
      <video ref={video} controls muted playsInline preload="none" poster="/media/coach-report-poster-v1.webp" width={664} height={1340} onPlay={() => setStarted(true)} onTimeUpdate={updateGuide} onSeeked={updateGuide} onEnded={() => { setStarted(false); setGuideVisible(false) }} aria-label="Coach Report walkthrough with fictional demo players" aria-describedby="coach-report-description">
        <source src="/media/coach-report-v1.mp4" type="video/mp4" />
        Your browser cannot play this video. <a href="/media/coach-report-v1.mp4">Download the Coach Report walkthrough</a>.
      </video>
      {!started && <button type="button" onClick={play} className={styles.coachVideoOverlay} aria-label="Play coach report video"><span><Play size={28} fill="currentColor"/></span><strong>Watch coach feedback in action</strong></button>}
    </div>
  </figure>
}
