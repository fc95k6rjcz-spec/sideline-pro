import type { Metadata } from "next"
import { ArrowRight, ArrowUpRight, ClipboardList, Users } from "lucide-react"
import styles from "../home.module.css"
import { GradingStory } from "../components/GradingStory"
import { CoachReportVideo } from "../components/CoachReportVideo"
import { PhoneScreenshot } from "../components/PhoneScreenshot"
import { SiteFooter, SiteHeader } from "../components/SiteChrome"

export const metadata: Metadata = {
  title: "Player grading & development · SidelinePro",
  description: "Coach reports, courtside grading and Team Builder, connected season to season. Built for netball and basketball clubs.",
}

// The detailed grading story moved off the homepage so it can be sent straight
// to head coaches and grading coordinators.
export default function GradingPage() {
  return <div className={styles.site} id="top">
    <a className={styles.skip} href="#main">Skip to content</a>
    <SiteHeader base="/"/>
    <main id="main">
      <section className={`${styles.section} ${styles.platform}`}>
        <div className={styles.sectionHead}><p className={styles.eyebrow}>PLAYER GRADING & DEVELOPMENT</p><h2>Better coaching.<br/><span>Better team decisions.</span></h2><p>Coach reports, game evidence and courtside assessments in the same player picture. Use skill guidance and position context to inform grading, then carry that evidence into Team Builder. Your committee makes the final call.</p></div>

        <article className={`${styles.feature} ${styles.featureLead}`}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><ClipboardList size={18}/>INTELLIGENT GRADING & TEAM FORMATION</p><h3>A better season starts with better team decisions.</h3><p>Every player’s coach reports, courtside scores and shooting averages from previous games, side by side. Explore a fictional player below.</p><a className={styles.darkLink} href="/demo/demo-center/grading">Try the grading demo <ArrowUpRight size={16}/></a></div>
          <GradingStory/>
          <section className={styles.developmentModel} aria-labelledby="development-model-title">
            <p className={styles.eyebrow}>THE SIDELINEPRO PLAYER DEVELOPMENT MODEL</p>
            <h4 id="development-model-title">Every report helps shape the next team.</h4>
            <p className={styles.modelIntro}>Connect what coaches see throughout the season with grading-day evidence. Then use that player picture to build the best-fit teams for each grade.</p>
            <details className={styles.sharedCriteria}><summary>Shared criteria. A consistent way to assess every player.</summary><p>For netball, our skill guidance is informed by Netball Australia’s <a href="https://netball.com.au/coaching/resources" target="_blank" rel="noopener noreferrer">Netball Skills Development Framework</a>. Coaches and graders use shared criteria and clear 1–5 skill descriptions, assessed relative to the player’s grade. That gives reports a common language and Team Builder a more consistent picture to work from.</p></details>
            <ol className={styles.modelSteps}>
              <li><span>01 / OBSERVE</span><h5>Coach reports</h5><p>Skill ratings, preferred positions and coaching observations give the scores context.</p><ArrowRight aria-hidden="true" size={22}/></li>
              <li><span>02 / ASSESS</span><h5>Grading reports</h5><p>Courtside assessments and shooting results sit alongside the coach’s season picture.</p><ArrowRight aria-hidden="true" size={22}/></li>
              <li><span>03 / BUILD</span><h5>Team Builder</h5><p>Use player metrics and position information to shape teams for each grade. People make the final call.</p></li>
            </ol>
            <div className={styles.modelOutcome}><p><strong>A development pathway that carries forward.</strong> The next season’s coach reports add to the picture, informing the next round of grading and team formation.</p><a className={styles.darkLink} href="/demo/demo-center/grading">Try grading &amp; team formation <ArrowUpRight size={17}/></a></div>
          </section>
        </article>

        <article id="development" className={styles.feature}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><Users size={18}/>COACHING & DEVELOPMENT</p><h3>Develop the player. Plan the next game.</h3><p>Give feedback the context of the player’s role. Connect skill ratings, preferred positions and development notes with weekly line-ups, so the season’s observations stay useful when the next team is formed.</p><a className={styles.darkLink} href="/demo/demo-center/lineups">Try the interactive line-up demo <ArrowUpRight size={16}/></a></div>
          <figure className={styles.phoneFigure}><PhoneScreenshot/><figcaption>Your weekly line-up, wherever you are.<small>Product render · fictional demo players</small></figcaption></figure>
          <CoachReportVideo/>
        </article>
      </section>
      <section id="contact" className={`${styles.section} ${styles.start}`}><p className={styles.eyebrow}>SEE IT FOR YOUR CLUB</p><h2>Grading day, without the clipboards.</h2><div className={styles.actions} style={{justifyContent:"center"}}><a className={styles.button} href="/#contact">Book a demo <ArrowUpRight size={17}/></a><a className={styles.darkLink} href="/#platform">See the whole platform <ArrowRight size={16}/></a></div></section>
    </main>
    <SiteFooter base="/"/>
  </div>
}
