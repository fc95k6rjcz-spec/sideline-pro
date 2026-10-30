import Image from "next/image"
import { ArrowUpRight, ArrowRight, Check, ClipboardList, Flag, Users, Workflow } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import styles from "./home.module.css"
import { MobileNav } from "./components/MobileNav"
import { PhoneScreenshot } from "./components/PhoneScreenshot"

const links = [["The platform", "#platform"], ["Who it’s for", "#people"], ["Seaforth story", "#seaforth"]]
const features = [
  { id: "grading", icon: ClipboardList, tag: "01 / INTELLIGENT GRADING & TEAM FORMATION", title: "A better season starts with better team decisions.", body: "Bring check-in, on-court scores and coach assessments into one grading workflow. Give your committee the context to build balanced teams, with people making the final call.", points: ["Digital grading and player check-in", "Coach insights alongside grading evidence", "Connected team formation"], image: "/lineup-studio-render.png", alt: "Existing SidelinePro mobile line-up screen", caption: "Your weekly line-up, wherever you are.", note: "Product render based on the current app. Demo player labels." },
  { id: "umpires", icon: Flag, tag: "02 / UMPIRE ROSTERING", title: "Put your officials in the picture.", body: "Build the roster around availability, accreditations and fair rotation. Keep assignments, confirmations and late changes together, with support for junior umpire development.", points: ["Availability-led allocations", "Confirmations and cancellation management", "Junior umpire mentoring and feedback"] },
  { id: "development", icon: Users, tag: "03 / COACHING & DEVELOPMENT", title: "Connect what coaches see with what players need next.", body: "Give coaches a hub for their squad, line-ups and structured assessments. Keep feedback and development history connected to the evidence your grading committee uses next season.", points: ["Coach assessments and season feedback", "Player development history", "Line-ups, positions and availability"] },
  { id: "playhq", icon: Workflow, tag: "04 / PLAYHQ WORKFLOWS", title: "Work with the systems your club already uses.", body: "Connect your club’s weekly work with PlayHQ. Bring fixtures and ladders into the club experience, and use team-building workflows to reduce repeated data entry.", points: ["PlayHQ fixture and ladder sync", "Team-building and reconciliation workflows", "Club and team information together"] },
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
          <div className={styles.featureCopy}><p className={styles.eyebrow}><f.icon size={18}/>{f.tag}</p><h3>{f.title}</h3><p>{f.body}</p><ul>{f.points.map(p=><li key={p}><Check size={16}/>{p}</li>)}</ul><a className={styles.darkLink} href="#contact">Explore this in your demo <ArrowUpRight size={16}/></a></div>
          {f.image?<figure className={styles.phoneFigure}><PhoneScreenshot/><figcaption>{f.caption}<small>{f.note}</small></figcaption></figure>:<div className={styles.workflow} aria-label={`${f.title} workflow`}><f.icon size={36} strokeWidth={1.3}/><span>{i===1?"THE RIGHT OFFICIAL. THE RIGHT GAME.":i===2?"A SEASON OF CONNECTED INSIGHT.":"YOUR CLUB + YOUR ASSOCIATION."}</span>{(i===1?["Availability & accreditation", "Allocation & confirmation", "Game day & mentor feedback"]:i===2?["Coach observation", "Assessment & development history", "Informed grading decisions"]:["PlayHQ fixtures & ladders", "Your club’s connected hub", "Teams & reconciliation"]).map((s,j)=><div key={s}><b>0{j+1}</b>{s}{j<2&&<ArrowRight size={16}/>}</div>)}<small>Connected workflow · SidelinePro</small></div>}
        </article>)}
      </section>
      <section id="people" className={`${styles.section} ${styles.people}`}><p className={styles.eyebrow}>ONE CLUB. EVERY ROLE.</p><h2>Your club. Your brand.<br/>Your own bespoke app.</h2><p className={styles.bespokeIntro}>Give your community an app that feels unmistakably yours. Built around your club’s identity and the way your people run their season.</p><div className={styles.bespokeShowcase}>
        <figure className={styles.appPhoto}>
          <Image src="/seaforth-own-app-raised.png" alt="Seaforth Netball’s own club app icon on a member’s iPhone home screen" width={1240} height={2010} sizes="(max-width:760px) 85vw, 360px" />
          <figcaption>Seaforth’s own club app. Photo edited to isolate the club app.</figcaption>
        </figure>
        <div className={styles.bespokeDetail}>
          <p className={styles.eyebrow}>A REAL CLUB. ITS OWN APP.</p>
          <h3>Your club belongs<br/>on their home screen.</h3>
          <p>Seaforth Netball has an app carrying its own club name and identity. That’s the experience we build around your community, too.</p>
          <ul><li><Check size={17}/> Your club’s name and app icon</li><li><Check size={17}/> Your colours and identity</li><li><Check size={17}/> Connected tools for your club’s roles</li></ul>
          <a className={styles.button} href="#contact">Picture your club’s app <ArrowUpRight size={17}/></a>
        </div>
      </div><div className={styles.roles}>{[["Committees & convenors","Keep grading, team formation, officials and club communications together."],["Coaches & managers","Know your squad, plan line-ups and record the feedback that helps players develop."],["Players & parents","Find team news, fixtures and availability in one club experience."],["Umpires & mentors","Stay across assignments and confirmations, with feedback for junior development."]].map(([title,body])=><div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div><p className={styles.brandPromise}>Your club’s name. Your colours. Your workflows.</p></section>
      <section id="payments" className={`${styles.section} ${styles.platform}`}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>PAYMENTS & PAYMENT TRACKING</p><h2>Connect the payment<br/>to the club paperwork.</h2></div><p>Integrate Visa and Mastercard payments through Stripe, with payment tracking connected to supported club workflows.</p></div>
        <div className={styles.steps}>
          <div><span>01 / COLLECT</span><h3>A familiar way to pay</h3><p>Let families pay by card through Stripe as part of a supported program registration.</p></div>
          <div><span>02 / MATCH</span><h3>Keep the paid list in step</h3><p>For connected registrations, confirmed Stripe payments update the matching registration and retain a payment reference.</p></div>
          <div><span>03 / REVIEW</span><h3>A clearer payment trail</h3><p>See recorded payments against registrations. Full refunds update automatically where supported; unmatched payments and partial refunds need review.</p></div>
        </div>
        <p className={styles.paymentNote}>Payment tracking is available for supported workflows. We’ll walk through your club’s collection and reconciliation requirements in the demo.</p>
        <a className={styles.darkLink} href="#contact">Discuss your club’s payments <ArrowUpRight size={16}/></a>
      </section>
      <section id="seaforth" className={`${styles.section} ${styles.caseStudy}`}><div className={styles.caseImage}><Image src="/seaforth-current-home.png" alt="Current Seaforth Netball Club homepage with navy navigation and Go Seaforth hero" width={1280} height={720} sizes="(max-width:760px) 100vw, 48vw"/></div><div><p className={styles.eyebrow}>IN PRACTICE / SEAFORTH NETBALL CLUB</p><h2>Built around<br/>real club life.</h2><p>Seaforth’s platform brings together the work of coaches, managers, umpires and the committee — from grading-day check-in to the weekly draw.</p><dl><div><dt>Grading with context</dt><dd>Coach assessments inform the grading committee’s view of each player.</dd></div><div><dt>A supported umpire pathway</dt><dd>Assignments, confirmations and junior mentor feedback in the same platform.</dd></div><div><dt>A connected weekly draw</dt><dd>PlayHQ fixture imports and ladders sit alongside club tools.</dd></div></dl><a className={styles.textLink} href="#contact">Walk through the Seaforth workflows <ArrowUpRight size={17}/></a></div></section>
      <section className={`${styles.section} ${styles.start}`}><p className={styles.eyebrow}>A PRACTICAL FIRST STEP</p><h2>Start with your club.<br/>Build the right plan together.</h2><div className={styles.steps}>{[["Show us your season","Tell us where the work piles up: grading, rostering, coaching or PlayHQ."],["See the relevant workflows","We’ll walk through the product with your club’s roles and priorities in mind."],["Agree the next steps","Discuss scope, setup, pricing and timing before making a decision."]].map(([title,body],i)=><div key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
      <section id="contact" className={`${styles.section} ${styles.contact}`}><div><p className={styles.eyebrow}>LET’S TALK CLUB SPORT</p><h2>Your club has its own rhythm.<br/><span>Let’s find your fit.</span></h2><p>Request a guided demo of the workflows that matter to you. This is a conversation about your club, with time for questions.</p><ul><li><Check size={17}/> Grading and team formation</li><li><Check size={17}/> Umpire rostering and development</li><li><Check size={17}/> Coaching, families and PlayHQ</li></ul><a href="mailto:rowan@sidelinepro.com.au">Prefer email? rowan@sidelinepro.com.au ↗</a></div><div className={styles.formCard}><h3>Request your club demo</h3><p>Tell us a little about your club. We’ll be in touch to arrange a walkthrough.</p><ContactForm/></div></section>
    </main>
    <footer className={styles.footer}><div><Image src="/logo-horizontal-dark.svg" alt="SidelinePro" width={174} height={48}/><p>100% Australian owned and operated.<br/>Built around Australian community sport.</p></div><div>{links.map(([label,href])=><a key={href} href={href}>{label}</a>)}<a href="#contact">Book a demo</a></div><small>© {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721 627</small></footer>
  </div>
}
