import styles from "../home.module.css"

export function CoachReportVideo() {
  return <figure className={styles.coachVideo}>
    <div className={styles.coachVideoHeader}><span>THE REAL APP, IN ACTION</span><span>40 SEC · SILENT</span></div>
    <video controls muted playsInline preload="none" poster="/media/coach-report-poster-v1.webp" width={664} height={1340} aria-label="Coach Report walkthrough with fictional demo players" aria-describedby="coach-report-description">
      <source src="/media/coach-report-v1.mp4" type="video/mp4" />
      Your browser cannot play this video. <a href="/media/coach-report-v1.mp4">Download the Coach Report walkthrough</a>.
    </video>
    <figcaption id="coach-report-description">Skill ratings. Coaching context. A clearer development focus.<small>Actual interface · fictional demo players</small></figcaption>
    <details><summary>What the walkthrough shows</summary><p>Explore eight skill ratings and their guidance, preferred positions, coaching context, next-season intent, strengths, development fields and notes. The recording ends at the Save and Save &amp; next controls.</p></details>
  </figure>
}
