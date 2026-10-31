import Image from "next/image"
import { ArrowUpRight, ArrowRight, Check, ClipboardList, Clock, Flag, MessagesSquare, Sparkles, Users, Wallet } from "lucide-react"
import { ContactForm } from "@/components/contact-form"
import styles from "./home.module.css"
import { GradingStory } from "./components/GradingStory"
import { SiteFooter, SiteHeader } from "./components/SiteChrome"

// Order follows a club president's questions: what is it → what does my club
// get → does it work anywhere real → what's in it → why you. The deep grading
// material (development model, coach report walkthrough) lives on /grading.
const sports = [
  { name: "Netball", body: "We know the difference between a Goal Attack and a Goal Keeper. We understand umpire allocations, grading, team selections and the unique challenges of running a netball club." },
  { name: "Basketball", body: "It’s referees, not umpires. A point guard has different responsibilities from a centre. Coaching, player development and game-day operations should reflect those differences." },
  { name: "Soccer", body: "There’s another language, another set of positions and another way clubs operate." },
]
const connected = ["Registrations", "Payments", "Officials", "Coaching", "Teams", "Club communications", "PlayHQ fixtures & ladders"]
const outcomes = [
  { icon: Clock, title: "Less administration.", body: "Automate time-consuming jobs such as umpire rostering, registrations, payments and team management. Give volunteers more time for the things they actually signed up to do." },
  { icon: ClipboardList, title: "Better player development.", body: "Equip coaches with tools for assessments, feedback, team selection and player development, helping them make more informed decisions throughout the season." },
  { icon: Users, title: "A better club experience.", body: "Bring your community together through your own branded website and app, with easier communication and access to everything members need." },
]

export default function Home() {
  return <div className={styles.site} id="top">
    <a className={styles.skip} href="#main">Skip to content</a>
    <SiteHeader/>
    <main id="main">
      <section className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}><span/> 100% AUSTRALIAN OWNED & OPERATED</p>
          <h1>Built for your sport.<br/><em>Made for your club.</em></h1>
          <p className={styles.intro}>Your club’s own branded website and mobile app, connected to powerful management tools that automate time-consuming admin, support coaching and player development, and make club life easier for everyone.</p>
          <p className={styles.heroTagline}>Designed around the unique way your sport works.</p>
          <div className={styles.actions}><a className={styles.button} href="#platform">See how it works <ArrowRight size={18}/></a><a className={styles.textLink} href="#contact">Book a demo <ArrowUpRight size={17}/></a></div>
          <div className={styles.heroNotes}><span><Check size={15}/> Purpose-built for netball and basketball clubs.</span></div>
        </div>
        <div className={styles.heroVisual}><Image src="/hero/sf-huddle-sky.png" alt="Community netball players coming together in a team huddle" fill priority sizes="(max-width: 760px) 100vw, 48vw" className={styles.heroPhoto}/><div className={styles.photoLabel}>FOR THE PEOPLE WHO<br/>MAKE CLUB SPORT HAPPEN.</div><div className={styles.photoBottom}><span>ONE CLUB. ALL CONNECTED.</span><ArrowUpRight size={24}/></div></div>
      </section>

      <section id="platform" className={`${styles.section} ${styles.people}`} aria-labelledby="platform-title">
        <p className={styles.eyebrow}>THE SIDELINEPRO PLATFORM</p>
        <h2 id="platform-title">One platform.<br/>Your whole club.</h2>
        <p className={styles.bespokeIntro}>Your website, mobile app and club management tools working together, all carrying your club’s name, badge and colours.</p>
        <div className={styles.platformShowcase}>
          <figure className={styles.platformSite}><Image src="/seaforth-home-render.jpg" alt="Seaforth Netball Club’s website with a Go Seaforth hero and club navigation" width={1600} height={790} sizes="(max-width:760px) 100vw, 60vw"/><figcaption><strong>Your club website</strong><span>Seaforth Netball Club · visual render</span></figcaption></figure>
          <figure className={styles.appPhoto}><Image src="/seaforth-app-notification.png" alt="Seaforth Netball’s own app and a court-change notification on an iPhone" width={1050} height={1348} sizes="(max-width:760px) 85vw, 300px"/><figcaption><strong>Your club’s own app</strong> Seaforth’s app, with a court-change notification.</figcaption></figure>
        </div>
        <p className={styles.platformConnected}>Behind the scenes, everything is connected:</p>
        <ul className={styles.connectedChips}>{connected.map(c=><li key={c}><Check size={14}/>{c}</li>)}</ul>
      </section>

      <section id="outcomes" className={`${styles.section} ${styles.outcomes}`} aria-labelledby="outcomes-title">
        <p className={styles.eyebrow}>THE SIDELINEPRO PROMISE · A BETTER WAY TO RUN YOUR CLUB</p>
        <h2 id="outcomes-title">Less time running the club.<br/><span>More time making it better.</span></h2>
        <div className={styles.outcomeGrid}>{outcomes.map(o=><article key={o.title}><o.icon size={26}/><h3>{o.title}</h3><p>{o.body}</p></article>)}</div>
      </section>

      <section id="seaforth" className={`${styles.section} ${styles.proof}`} aria-labelledby="seaforth-title">
        <div className={styles.proofStat}>
          <p className={styles.eyebrow}>REAL CLUB. REAL RESULTS.</p>
          <h2 id="seaforth-title"><strong>10 hours</strong>of volunteer time saved every week, on umpire rostering alone.</h2>
          <p>Seaforth Netball Club runs its season on SidelinePro. The umpire rostering team has handed availability, allocations, confirmations and late changes to the platform, and gets those hours back every week: time it can now put into developing its officials.</p>
          <p>And that’s before the paperwork. Account reconciliation and matching player payments for club events are where Seaforth’s treasurer and organisers see the biggest savings of all.</p>
          <small>Based on time savings reported by Seaforth Netball Club’s umpire rostering team.</small>
        </div>
        <dl className={styles.proofList}>
          <div><dt>Umpire rostering</dt><dd>Assignments, confirmations and junior mentor feedback in one place.</dd></div>
          <div><dt>Payments & reconciliation</dt><dd>Player payments matched to registrations and events, without the spreadsheet chase.</dd></div>
          <div><dt>Grading with context</dt><dd>Coach assessments inform the grading committee’s view of each player.</dd></div>
          <div><dt>A connected weekly draw</dt><dd>PlayHQ fixtures and ladders alongside the club’s own app.</dd></div>
        </dl>
      </section>

      <section id="features" className={`${styles.section} ${styles.platform}`} aria-labelledby="features-title">
        <div className={styles.sectionHead}><p className={styles.eyebrow}>WHAT’S INSIDE</p><h2 id="features-title">The tools behind<br/><span>a better-run club.</span></h2><p>Each one saves volunteers time. Try them yourself in the interactive demos, with a fictional club and no sign-up.</p></div>

        <article id="grading" className={`${styles.feature} ${styles.featureLead}`}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><ClipboardList size={18}/>PLAYER GRADING & DEVELOPMENT</p><h3>Better coaching. Better team decisions.</h3><p>Give coaches and grading committees a clearer picture of every player’s development.</p><p>SidelinePro brings together player assessments, coach feedback, preferred positions and game performance to support more consistent grading and team selection. And because that information stays connected from season to season, coaches spend less time starting from scratch and more time helping players improve.</p><a className={styles.darkLink} href="/grading">Explore player grading and development <ArrowUpRight size={16}/></a></div>
          <GradingStory/>
        </article>

        <article id="umpires" className={styles.feature}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><Flag size={18}/>UMPIRE ROSTERING</p><h3>Umpire rostering without the weekly headache.</h3><p>Stop spending hours collecting availability, allocating games, chasing confirmations and managing last-minute changes.</p><p>SidelinePro simplifies the entire rostering process. It suggests umpires for open games, sends each one their duty straight to their phone and shows every confirmation as it comes back, helping convenors share games fairly, handle changes and support junior umpires.</p><p className={styles.featurePull}>Less time building rosters. More time developing officials.</p><a className={styles.darkLink} href="/demo/demo-center/umpires">See umpire rostering in action <ArrowUpRight size={16}/></a></div>
          <figure className={styles.umpireRender}><a href="/demo/demo-center/umpires" aria-label="See umpire rostering in action"><Image src="/umpire-rostering-render.jpg" alt="Product render of the SidelinePro umpire assignments workspace on a desktop display, using fictional club data" width={1536} height={1024} sizes="(max-width:760px) 100vw, 50vw"/></a><figcaption>Assignments, availability and mentor support.<small>Product render · fictional demo data</small></figcaption></figure>
        </article>

        <article id="communications" className={styles.feature}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><MessagesSquare size={18}/>CLUB COMMUNICATIONS</p><h3>One club app. Everyone connected.</h3><p>Replace scattered WhatsApp groups and fragmented communications with a central place for teams, coaches, umpires and committees to stay informed.</p><ul><li><Sparkles size={16}/>AI-assisted checks flag safeguarding concerns for authorised officials to review</li><li><Sparkles size={16}/>A club assistant answers questions about fixtures and club information</li></ul></div>
          <figure className={styles.chatRender}><Image src="/club-communications-render.jpg" alt="Product render of SidelinePro team conversations and club chat groups on two phones, using fictional names and messages" width={1536} height={1024} sizes="(max-width:760px) 100vw, 50vw"/><figcaption>Your teams. Your club groups. One connected conversation.<small>Product render · fictional conversations</small></figcaption></figure>
        </article>

        <article id="payments" className={styles.feature}>
          <div className={styles.featureCopy}><p className={styles.eyebrow}><Wallet size={18}/>REGISTRATIONS, PAYMENTS & RECONCILIATION</p><h3>From program to payment to player. Reconciled automatically.</h3><p>Families register for a program on your club’s own website and pay by card. The moment Stripe confirms the payment, SidelinePro marks that player as paid for that program, so your treasurer can see exactly who has paid for what, without matching bank lines to a spreadsheet.</p><ul><li><Check size={16}/>Program registration and payment on your club’s website</li><li><Check size={16}/>Secure Stripe webhooks reconcile every payment to the player and program</li><li><Check size={16}/>Full refunds update the player’s record automatically</li><li><Clock size={16}/><span><strong>Coming soon:</strong> Xero and MYOB sync, and API access for your club’s other systems</span></li></ul><a className={styles.darkLink} href="#contact">Book a demo <ArrowUpRight size={16}/></a></div>
          <figure className={styles.programFlow}>
            <Image src="/baseline-basketball-concept.jpg" alt="Baseline Basketball Academy fictional club website with Term 4 registrations open and a Register now button" width={1428} height={1100} sizes="(max-width:760px) 100vw, 50vw"/>
            <ol aria-label="How a registration is reconciled">{[["Program","Term 4 registrations open"],["Register & pay","Card payment through Stripe"],["Reconciled","Webhook marks the player paid"],["Your books","Xero & MYOB sync · coming soon"]].map(([t,d],i)=><li key={t} className={i===3?styles.flowSoon:undefined}><span>0{i+1}</span><strong>{t}</strong><small>{d}</small></li>)}</ol>
            <figcaption>A program on the club’s own website, through to a reconciled player record.<small>Baseline Basketball Academy · fictional design concept, not a live customer website</small></figcaption>
          </figure>
        </article>
      </section>

      <section id="approach" className={`${styles.section} ${styles.manifesto}`} aria-labelledby="approach-title">
        <div className={styles.manifestoHead}>
          <p className={styles.eyebrow}>OUR APPROACH</p>
          <h2 id="approach-title">We don’t generalise.<br/><span>We specialise.</span></h2>
          <p className={styles.manifestoLead}>Your sport isn’t generic. Your software shouldn’t be.</p>
        </div>
        <div className={styles.manifestoBody}>
          <p>Some platforms promise every sport, every player, everywhere.</p>
          <p>We take a different approach. We believe great club software starts with truly understanding the sport it serves.</p>
          <div className={styles.sportCards}>{sports.map(s=><article key={s.name}><span>IN {s.name.toUpperCase()}</span><p>{s.body}</p></article>)}</div>
          <p className={styles.manifestoPull}>We don’t take one generic sports app and change the labels. We build around the intricacies of your game.</p>
          <p>And we make it yours.</p>
          <ul className={styles.manifestoOwn}>{["Your club’s branding","Your colours","Your teams","Your people"].map(t=><li key={t}><Check size={16}/>{t}</li>)}</ul>
          <p className={styles.manifestoSign}>Powered by SidelinePro. Built around your sport.</p>
          <p className={styles.manifestoClose}>Because your club deserves more than a one-size-fits-all solution.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.start}`}><p className={styles.eyebrow}>EASY TO GET STARTED</p><h2>Start with your club.<br/>Build the right plan together.</h2><div className={styles.steps}>{[["Show us your season","Tell us where the work piles up: rostering, registrations, grading or communications."],["See it working for your club","We’ll walk through the platform with your club’s roles and priorities in mind."],["Agree the next steps","Discuss scope, setup, pricing and timing before making a decision. We handle the setup."]].map(([title,body],i)=><div key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></div>)}</div></section>

      <section id="contact" className={`${styles.section} ${styles.contact}`}><div><p className={styles.eyebrow}>BOOK A DEMO</p><h2>See it working<br/><span>for your club.</span></h2><p>Tell us about your netball or basketball club. We’ll show you the workflows that matter to your committee, coaches and volunteers, and how quickly your club could be up and running.</p><ul><li><Check size={17}/> Your own branded website and app</li><li><Check size={17}/> Umpire rostering, registrations and payments</li><li><Check size={17}/> Player grading and coaching tools</li></ul><a href="mailto:rowan@sidelinepro.com.au">Prefer email? rowan@sidelinepro.com.au ↗</a></div><div className={styles.formCard}><h3>Book your club demo</h3><p>Tell us a little about your club. We’ll be in touch to arrange a walkthrough.</p><ContactForm/></div></section>
    </main>
    <SiteFooter/>
  </div>
}
