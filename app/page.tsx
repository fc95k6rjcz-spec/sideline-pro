import Image from "next/image"
import { ArrowUpRight, ArrowRight, Check, ClipboardList, Flag, Users, Workflow } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import styles from "./home.module.css"
import { MobileNav } from "./components/MobileNav"
import { PhoneScreenshot } from "./components/PhoneScreenshot"
import { GradingStory } from "./components/GradingStory"
import { CoachReportVideo } from "./components/CoachReportVideo"

const links = [["The platform", "#platform"], ["Who it’s for", "#people"], ["Communications", "#communications"], ["Seaforth story", "#seaforth"]]
const features = [
  { id: "grading", demoHref: "/demo/demo-center/grading", demoLabel: "Try the grading demo", icon: ClipboardList, tag: "01 / INTELLIGENT GRADING & TEAM FORMATION", title: "A better season starts with better team decisions.", body: "Bring check-in, on-court scores and coach assessments into one grading workflow. Give your committee the context to build balanced teams, with people making the final call.", points: ["Shared competency guidance and courtside scores", "GA / GS shooting averages and position context", "Coach reports connected to Team Builder"], image: "/lineup-studio-render.png", alt: "Existing SidelinePro mobile line-up screen", caption: "Your weekly line-up, wherever you are.", note: "Product render based on the current app. Demo player labels." },
  { id: "umpires", demoHref: "/demo/demo-center/umpires", demoLabel: "Try the umpire rostering demo", icon: Flag, tag: "02 / UMPIRE ROSTERING", title: "Put your officials in the picture.", body: "Build the roster around availability, accreditations and fair rotation. Keep assignments, confirmations and late changes together, with support for junior umpire development.", points: ["Availability-led allocations", "Confirmations and cancellation management", "Junior umpire mentoring and feedback"] },
  { id: "development", demoHref: "/demo/demo-center/lineups", demoLabel: "Try the interactive line-up demo", icon: Users, tag: "03 / COACHING & DEVELOPMENT", title: "Develop the player. Plan the next game.", body: "Turn coaching observations into useful development feedback. Keep skill reports, preferred positions and weekly line-ups connected to the player’s season.", points: ["Clear skill ratings and development notes", "Position preferences alongside coach context", "Weekly line-ups in your club’s own app"] },
  { id: "playhq", demoHref: "/demo/demo-center", demoLabel: "Explore the interactive demos", icon: Workflow, tag: "04 / PLAYHQ WORKFLOWS", title: "Work with the systems your club already uses.", body: "Connect your club’s weekly work with PlayHQ. Bring fixtures and ladders into the club experience, and use team-building workflows to reduce repeated data entry.", points: ["PlayHQ fixture and ladder sync", "Team-building and reconciliation workflows", "Club and team information together"] },
]

export default function Home() {
  return <div className={styles.site} id="top">
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}><div className={styles.nav}>
      <a href="#top" aria-label="SidelinePro home"><Image src="/logo-horizontal-dark.svg" alt="SidelinePro" width={174} height={48} priority className={styles.logo}/></a>
      <nav aria-label="Main navigation" className={styles.desktopNav}>{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <a className={styles.button} href="#contact">Book a demo <ArrowUpRight size={16}/></a>
      <MobileNav className={styles.mobileNav}/>
    </div></header>
    <main id="main">
      <section className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}><span/> 100% AUSTRALIAN OWNED & OPERATED</p>
          <h1>The operating system for <em>community sport.</em></h1>
          <p className={styles.intro}>Delivered through your club’s own bespoke app. Your name, your colours and the workflows that connect your teams, umpires, coaches and families — from grading day to the final whistle.</p>
          <div className={styles.actions}><a className={styles.button} href="#contact">See your club’s app <ArrowUpRight size={18}/></a><a className={styles.textLink} href="#platform">Explore the platform <ArrowRight size={17}/></a></div>
          <div className={styles.heroNotes}><span><Check size={15}/> PlayHQ workflows</span><span><Check size={15}/> Connected player development</span></div>
        </div>
        <div className={styles.heroVisual}><Image src="/hero/sf-huddle-sky.png" alt="Community netball players coming together in a team huddle" fill priority sizes="(max-width: 760px) 100vw, 48vw" className={styles.heroPhoto}/><div className={styles.photoLabel}>FOR THE PEOPLE WHO<br/>MAKE CLUB SPORT HAPPEN.</div><div className={styles.photoBottom}><span>ONE CLUB. ALL CONNECTED.</span><ArrowUpRight size={24}/></div></div>
      </section>
      <div className={styles.pathStrip}><span>ONE CONNECTED SEASON</span><a href="#grading">Grade & form teams</a><ArrowRight/><a href="#umpires">Roster officials</a><ArrowRight/><a href="#development">Develop players</a><ArrowRight/><a href="#playhq">Connect PlayHQ</a></div>
      <section id="platform" className={`${styles.section} ${styles.platform}`}>
        <div className={styles.sectionHead}><p className={styles.eyebrow}>THE SIDELINEPRO DIFFERENCE</p><h2>The work behind the weekend.<br/><span>Finally, connected.</span></h2><p>Grading isn’t separate from development. Umpires aren’t an afterthought. And your club doesn’t operate in isolation from its association. Your software should reflect that.</p></div>
        {features.map((f,i)=><article id={f.id} key={f.id} className={`${styles.feature} ${i===0?styles.featureLead:""}`}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><f.icon size={18}/>{f.tag}</p><h3>{f.title}</h3><p>{f.body}</p><ul>{f.points.map(p=><li key={p}><Check size={16}/>{p}</li>)}</ul><a className={styles.darkLink} href={f.demoHref}>{f.demoLabel} <ArrowUpRight size={16}/></a></div>
          {i===0?<GradingStory/>:i===1?<figure className={styles.umpireRender}><a href={f.demoHref} aria-label={f.demoLabel}><Image src="/umpire-rostering-render.jpg" alt="Product render of the SidelinePro umpire assignments workspace on a desktop display, using fictional club data" width={1536} height={1024} sizes="(max-width:760px) 100vw, 50vw"/></a><figcaption>Assignments, availability and mentor support.<small>Product render · fictional demo data</small></figcaption></figure>:i===2?<figure className={styles.phoneFigure}><PhoneScreenshot/><figcaption>Your weekly line-up, wherever you are.<small>Product render · fictional demo players</small></figcaption></figure>:<figure className={styles.connectedVisual}>
            <div className={styles.connectedCanvas}><p className={styles.visualLabel}>ONE FIXTURE. YOUR WHOLE CLUB CONNECTED.</p><div className={styles.fixtureCard}><span>THE WEEKLY DRAW · EXAMPLE</span><strong>Harbor View U13</strong><p>Saturday · 10:30am · Court 6</p><span className={styles.fixtureStatus}><Check size={13}/> Fixture information</span></div><div className={styles.connectionStem}/><div className={styles.clubDestinations}><span>Team &amp; families</span><span>Coaches</span><span>Officials</span></div><p className={styles.connectedFoot}>Fixtures and ladders alongside your club’s daily work.</p></div><figcaption>Association information. One club experience.<small>Workflow illustration · fictional fixture</small></figcaption>
          </figure>}
          {i===0&&<>
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
          </>}
          {i===2&&<CoachReportVideo/>}
        </article>)}
      </section>
      <section id="people" className={`${styles.section} ${styles.people}`}><p className={styles.eyebrow}>ONE CLUB. EVERY ROLE.</p><h2>Your club. Your brand.<br/>Your own bespoke app.</h2><p className={styles.bespokeIntro}>Give your community an app that feels unmistakably yours. Built around your club’s identity and the way your people run their season.</p><div className={styles.bespokeShowcase}>
        <figure className={styles.appPhoto}>
          <Image src="/seaforth-app-notification.png" alt="Seaforth Netball’s own app and a court-change notification on an iPhone" width={1050} height={1348} sizes="(max-width:760px) 85vw, 360px" />
          <figcaption>Seaforth’s own club app, with a court-change notification.</figcaption>
        </figure>
        <div className={styles.bespokeDetail}>
          <p className={styles.eyebrow}>A REAL CLUB. ITS OWN APP.</p>
          <h3>Your club belongs<br/>on their home screen.</h3>
          <p>Seaforth Netball has an app carrying its own club name and identity. That’s the experience we build around your community, too.</p>
          <ul><li><Check size={17}/> Your club’s name and app icon</li><li><Check size={17}/> Your colours and identity</li><li><Check size={17}/> Connected tools for your club’s roles</li></ul>
          <a className={styles.button} href="#contact">Picture your club’s app <ArrowUpRight size={17}/></a>
        </div>
      </div><div className={styles.roles}>{[["Committees & convenors","Keep grading, team formation, officials and club communications together."],["Coaches & managers","Know your squad, plan line-ups and record the feedback that helps players develop."],["Players & parents","Find team news, fixtures and availability in one club experience."],["Umpires & mentors","Stay across assignments and confirmations, with feedback for junior development."]].map(([title,body])=><div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div><p className={styles.brandPromise}>Your club’s name. Your colours. Your workflows.</p></section>
      <section id="communications" className={`${styles.section} ${styles.communications}`} aria-labelledby="communications-title">
        <div className={styles.commsIntro}><div><p className={styles.eyebrow}>INTELLIGENT CLUB COMMUNICATIONS</p><h2 id="communications-title">Every team.<br/>Every conversation.<br/><span>One club app.</span></h2><p>Move the conversation out of scattered WhatsApp groups and into your club’s own app. Keep team chats, coaching groups and committee conversations together, with intelligent help close at hand.</p><a className={styles.button} href="#contact">See your club’s communications <ArrowUpRight size={17}/></a></div>
        <figure className={styles.chatRender}><Image src="/club-communications-render.jpg" alt="Product render of SidelinePro team conversations and club chat groups on two phones, using fictional names and messages" width={1536} height={1024} sizes="(max-width:760px) 100vw, 55vw"/><figcaption>Your teams. Your club groups. One connected conversation.<small>Product render · fictional conversations</small></figcaption></figure></div>
        <div className={styles.commsBenefits}>
          <article><span>01 / KEEP EVERYONE CONNECTED</span><h3>Less switching. Less chasing.</h3><p>Find your team conversations, private messages and club groups in one place. Keep coaches, managers, umpires and committee members connected inside your club’s own app.</p></article>
          <article><span>02 / SUPPORT CLUB OVERSIGHT</span><h3>AI flags concerns. People decide.</h3><p>AI-assisted checks can flag potential bullying, abusive language and safeguarding concerns in team chats for authorised club officials to review and follow up.</p></article>
          <article><span>03 / GET INTELLIGENT HELP</span><h3>Ask the club. Find the answer.</h3><p>The club assistant helps answer questions about fixtures, club information and your own team, using club knowledge and the member information you’re authorised to access.</p></article>
        </div><p className={styles.commsNote}>AI-assisted checks support club oversight. Flagged concerns are reviewed by people; the club assistant uses approved chat-derived information rather than reading raw conversations.</p>
      </section>
      <section id="payments" className={`${styles.section} ${styles.paymentsSection}`}>
        <div className={styles.paymentIntro}><div><p className={styles.eyebrow}>PAYMENTS &amp; PAYMENT TRACKING</p><h2>Connect the payment<br/>to the club paperwork.</h2><p>Visa and Mastercard payments through Stripe, with payment references connected to supported registrations.</p><a className={styles.darkLink} href="#contact">Discuss your club’s payments <ArrowUpRight size={16}/></a></div><figure className={styles.paymentVisual}><div className={styles.paymentCanvas}><p className={styles.visualLabel}>FROM CARD PAYMENT TO CLUB RECORD</p><div className={styles.cardBrands}><Image src="/payments/visa.svg" alt="Visa" width={64} height={40}/><Image src="/payments/mastercard.svg" alt="Mastercard" width={64} height={40}/></div><div className={styles.paymentConnector}/><div className={styles.stripeNode}><Image src="/payments/stripe.svg" alt="Stripe" width={76} height={40}/><span>Card payment</span></div><div className={styles.paymentConnector}/><div className={styles.registrationNode}><Check size={18}/><div><strong>Connected registration</strong><span>Payment status + reference</span></div></div></div><figcaption>A clearer trail from payment to registration.<small>Workflow illustration · supported registration workflows</small></figcaption></figure></div>
        <div className={styles.steps}>
          <div><span>01 / COLLECT</span><h3>A familiar way to pay</h3><p>Let families pay by card through Stripe as part of a supported program registration.</p></div>
          <div><span>02 / MATCH</span><h3>Keep the paid list in step</h3><p>For connected registrations, confirmed Stripe payments update the matching registration and retain a payment reference.</p></div>
          <div><span>03 / REVIEW</span><h3>A clearer payment trail</h3><p>See recorded payments against registrations. Full refunds update automatically where supported; unmatched payments and partial refunds need review.</p></div>
        </div>
        <p className={styles.paymentNote}>Payment tracking is available for supported workflows. We’ll walk through your club’s collection and reconciliation requirements in the demo.</p>
        <div className={styles.accountingConnections}><h3>Your club’s accounting workflow</h3><p>Using <strong>Xero</strong> or <strong>MYOB</strong>? We’ll confirm the supported accounting connection and reconciliation workflow for your club in your demo.</p></div>
      </section>
      <section id="club-designs" className={`${styles.section} ${styles.clubDesigns}`} aria-labelledby="club-designs-title">
        <div className={styles.designHeading}><div><p className={styles.eyebrow}>YOUR IDENTITY. YOUR EXPERIENCE.</p><h2 id="club-designs-title">A different sport.<br/>An unmistakably different club.</h2></div><div><p>From community netball to a basketball academy, your club’s website should feel like your club. Your name, your colours and your own character.</p><a className={styles.darkLink} href="#contact">Picture your club’s website <ArrowUpRight size={16}/></a></div></div>
        <figure className={styles.designConcept}><Image src="/baseline-basketball-concept.jpg" alt="Baseline Basketball Academy fictional website concept with coral accents, monochrome basketball photography and program navigation" width={1428} height={1100} sizes="(max-width:760px) 100vw, 1180px"/><figcaption><strong>Baseline Basketball Academy</strong><span>Fictional design concept · illustrative render, not a live customer website</span></figcaption></figure>
      </section>
      <section id="seaforth" className={`${styles.section} ${styles.caseStudy}`}><figure className={styles.caseImage}><Image src="/seaforth-home-render.jpg" alt="Render of the Seaforth Netball Club website with a Go Seaforth hero and club navigation" width={1600} height={790} sizes="(max-width:760px) 100vw, 48vw"/><figcaption>Seaforth Netball Club website · visual render</figcaption></figure><div><p className={styles.eyebrow}>IN PRACTICE / SEAFORTH NETBALL CLUB</p><h2>Built around<br/>real club life.</h2><p>Seaforth’s platform brings together the work of coaches, managers, umpires and the committee — from grading-day check-in to the weekly draw.</p><dl><div><dt>Grading with context</dt><dd>Coach assessments inform the grading committee’s view of each player.</dd></div><div><dt>A supported umpire pathway</dt><dd>Assignments, confirmations and junior mentor feedback in the same platform.</dd></div><div><dt>A connected weekly draw</dt><dd>PlayHQ fixture imports and ladders sit alongside club tools.</dd></div></dl><a className={styles.textLink} href="#contact">Walk through the Seaforth workflows <ArrowUpRight size={17}/></a></div></section>
      <section className={`${styles.section} ${styles.start}`}><p className={styles.eyebrow}>A PRACTICAL FIRST STEP</p><h2>Start with your club.<br/>Build the right plan together.</h2><div className={styles.steps}>{[["Show us your season","Tell us where the work piles up: grading, rostering, coaching or PlayHQ."],["See the relevant workflows","We’ll walk through the product with your club’s roles and priorities in mind."],["Agree the next steps","Discuss scope, setup, pricing and timing before making a decision."]].map(([title,body],i)=><div key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
      <section id="contact" className={`${styles.section} ${styles.contact}`}><div><p className={styles.eyebrow}>LET’S TALK CLUB SPORT</p><h2>Your club has its own rhythm.<br/><span>Let’s find your fit.</span></h2><p>Request a guided demo of the workflows that matter to you. This is a conversation about your club, with time for questions.</p><ul><li><Check size={17}/> Grading and team formation</li><li><Check size={17}/> Umpire rostering and development</li><li><Check size={17}/> Coaching, families and PlayHQ</li></ul><a href="mailto:rowan@sidelinepro.com.au">Prefer email? rowan@sidelinepro.com.au ↗</a></div><div className={styles.formCard}><h3>Request your club demo</h3><p>Tell us a little about your club. We’ll be in touch to arrange a walkthrough.</p><ContactForm/></div></section>
    </main>
    <footer className={styles.footer}><div><Image src="/logo-horizontal-dark.svg" alt="SidelinePro" width={174} height={48}/><p>100% Australian owned and operated.<br/>Built around Australian community sport.</p></div><div>{links.map(([label,href])=><a key={href} href={href}>{label}</a>)}<a href="#contact">Book a demo</a></div><small>© {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721 627</small></footer>
  </div>
}
