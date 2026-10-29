import { PhoneScreenshot } from "../components/PhoneScreenshot"
import type { Metadata } from "next"
import Image from "next/image"
import { Barlow_Condensed } from "next/font/google"
import { HeroCarousel, type HeroSlide } from "../components/HeroCarousel"
import { DemoForm } from "./DemoForm"

/*
 * "Live" homepage redesign — staged at /update for review before it
 * replaces app/page.tsx. Follows design_handoff_live/README.md with one
 * deliberate change: the hero keeps the rotating club-photo carousel from
 * the current homepage instead of the mock card stack.
 */

export const metadata: Metadata = {
  title: "SidelinePro | Preview",
  robots: { index: false, follow: false },
}

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-barlow",
})

/* ── Tokens ─────────────────────────────────────────────── */
const NAVY = "#001025"
const NAVY2 = "#0a1f3a"
const TEAL = "#00BFAE"
const display = { fontFamily: "var(--font-barlow), Poppins, sans-serif" } as const

const container = "mx-auto w-full max-w-[1240px]"
const sectionPad = "px-5 py-[72px] sm:px-7 lg:py-[100px]"
const h2 = "font-extrabold uppercase leading-[0.95]"
const h2Size = { fontSize: "clamp(44px,6vw,92px)" } as const
const eyebrow = "text-[13px] font-bold uppercase tracking-[0.14em]"
const pill = "inline-flex items-center rounded-full transition-transform hover:scale-[1.03]"
const tealPill = `${pill} bg-[#00BFAE] font-bold text-[#001025]`
const tile = "transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1.5 hover:-rotate-1"

/* Logo: handoff artwork, viewBox 807×665 */
function Lockup({ height }: { height: number }) {
  return (
    <Image
      src="/update/logo-stacked.svg"
      alt="SidelinePro"
      width={Math.round(height * (807 / 665))}
      height={height}
      priority
    />
  )
}

/* ── Nav ────────────────────────────────────────────────── */
const navLinks: [string, string][] = [
  ["Game day", "#saturday"],
  ["What you get", "#features"],
  ["See a real club", "#dimes"],
]

function Navbar() {
  return (
    <nav className="sticky top-0 z-[100] h-[84px] border-b border-white/[0.08] bg-[#001025]/90 backdrop-blur-[18px]">
      <div className={`${container} flex h-full items-center justify-between gap-6 px-5 sm:px-7`}>
        <a href="#top" aria-label="SidelinePro home" className="flex items-center">
          <Lockup height={58} />
        </a>
        <div className="flex items-center gap-5 sm:gap-[30px]">
          <div className="hidden items-center gap-[30px] md:flex">
            {navLinks.map(([label, href]) => (
              <a key={label} href={href} className="text-[15px] font-medium text-[#e6edf7] hover:text-[#00BFAE]">
                {label}
              </a>
            ))}
          </div>
          <a href="#demo" className={`${tealPill} px-5 py-2.5 text-[14px] sm:px-6 sm:py-3 sm:text-[15px]`}>
            Book a demo
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ── Hero — new copy, existing rotating photo on the right ── */
const heroSlides: HeroSlide[] = [
  { src: "/hero/qc-hands-in.png", alt: "Junior netball team hands in before a game", focus: "center 40%" },
  { src: "/hero/qc-centre-pass.png", alt: "Netball player passing from the centre circle", focus: "center 40%" },
  { src: "/hero/sf-huddle-sky.png", alt: "Netball team huddle holding a ball against the sky", focus: "45% 50%" },
  { src: "/hero/qc-shot-at-goal.png", alt: "Netball players reaching for a shot at goal", focus: "center 30%" },
  { src: "/hero/sf-three-girls.png", alt: "Three junior netballers watching from the sideline", focus: "center 55%" },
  { src: "/hero/sf-shooting.jpg", alt: "Netball goal shooter lining up a shot", focus: "center 45%" },
  { src: "/hero/sf-team-court.png", alt: "Netball team posing on an outdoor court", focus: "center 40%" },
]

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#001025]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(900px 500px at 85% 20%, rgba(0,191,174,0.22), transparent 60%)" }}
        aria-hidden
      />
      <div className={`${container} relative z-20 flex items-center px-5 py-16 sm:px-7 lg:min-h-[min(calc(100vh-84px),760px)] lg:py-[72px]`}>
        <div className="lg:max-w-[560px]">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#00BFAE]/40 bg-[#00BFAE]/[0.12] py-[7px] pl-2.5 pr-3.5 text-[13px] font-semibold text-[#00BFAE]">
            <span className="h-[9px] w-[9px] rounded-full bg-[#00BFAE] live-dot" />
            Live club view · what a Saturday looks like on SidelinePro
          </div>
          <h1
            className="mt-[26px] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-white"
            style={{ ...display, fontSize: "clamp(60px,8vw,120px)" }}
          >
            Less admin.
            <br />
            <span className="text-[#00BFAE]">More time.</span>
            <br />
            Better club sport.
          </h1>
          <p className="mt-[26px] max-w-[520px] text-[19px] leading-[1.5] text-[#a5b3c7]">
            Registrations, fixtures, umpire rostering, grading and comms, running themselves. Built for
            the volunteers who make Australian club sport happen.
          </p>
          <div className="mt-[34px] flex flex-wrap items-center gap-3.5">
            <a href="#demo" className={`${tealPill} px-8 py-4 text-[17px]`}>
              Book a 20-min demo
            </a>
            <a
              href="#dimes"
              className={`${pill} border-[1.5px] border-white/30 px-7 py-[15px] text-[17px] font-semibold text-white`}
            >
              See a real club running on it →
            </a>
          </div>
        </div>
      </div>

      {/* Rotating club photos — kept from the current homepage. Straight edge
          on phones, angled left edge pinned right on desktop. */}
      <HeroCarousel
        slides={heroSlides}
        className="min-h-[340px] lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:w-[52%] lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]"
      />
    </section>
  )
}

/* ── Ticker ─────────────────────────────────────────────── */
const ticker = [
  "Umpires rostered",
  "Teams pushed to PlayHQ",
  "Grading collated",
  "Ladders synced",
  "Ground change sent",
  "Fees reconciled",
  "Line-ups set",
  "Website updated itself",
]

function Ticker() {
  const items = [...ticker, ...ticker]
  return (
    <div className="overflow-hidden whitespace-nowrap bg-[#00BFAE] py-4 text-[#001025]" aria-hidden>
      <div className="ticker-track inline-flex text-[26px] font-bold uppercase tracking-[0.02em]" style={display}>
        {items.map((t, i) => (
          <span key={i} className="px-[22px]">
            {t}
            <span className="ml-11">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Game day timeline ──────────────────────────────────── */
const day = [
  { time: "6:45", title: "Rain check", body: "Field 2 closed. Ground change goes to 3 teams in one tap. 61 of 61 parents see it before breakfast." },
  { time: "8:30", title: "First whistle", body: "All 14 umpires rostered on Tuesday night from who was free. Nobody rang anybody." },
  { time: "10:40", title: "Scores in", body: "Managers tap the score in the app. Ladders update live, straight from the association." },
  { time: "1:15", title: "Late sign-up", body: "A new U8 registers from the sideline on Mum's phone. Paid, waivered, in the PlayHQ team by lunch." },
  { time: "5:00", title: "Sunday is yours", body: "Grading forms are already collated. Nothing to type up. The committee gets its weekend back." },
]

function Saturday() {
  return (
    <section id="saturday" className={`scroll-mt-[84px] bg-white text-[#001025] ${sectionPad}`}>
      <div className={container}>
        <p className={`${eyebrow} text-[#008f83]`}>A Saturday on SidelinePro</p>
        <h2 className={`${h2} mt-2.5 max-w-[900px] tracking-[-0.01em]`} style={{ ...display, ...h2Size }}>
          The committee slept in.
          <br />
          <span className="text-[#00BFAE]">The club still ran.</span>
        </h2>
        <div className="mt-14 grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {day.map((d) => (
            <div
              key={d.time}
              className={`${tile} flex min-h-[220px] flex-col justify-between gap-5 rounded-[18px] bg-[#f3f7f8] px-6 py-[26px]`}
            >
              <span className="text-[44px] font-extrabold leading-none text-[#00BFAE]" style={display}>
                {d.time}
              </span>
              <div>
                <p className="text-[17px] font-bold leading-[1.3]">{d.title}</p>
                <p className="mt-1.5 text-[14px] leading-[1.5] text-[#4c5b6d]">{d.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Feature bento ──────────────────────────────────────── */
type Tile = { wide?: boolean; bg: string; fg: string; border: string; kicker: string; title: string; body: string }
const tiles: Tile[] = [
  { wide: true, bg: TEAL, fg: NAVY, border: TEAL, kicker: "Umpires & refs", title: "Rostered while you sleep", body: "Auto-allocated from availability. The single biggest time sink, gone. ~10 hrs a week." },
  { bg: NAVY2, fg: "#fff", border: "rgba(255,255,255,0.12)", kicker: "PlayHQ", title: "Teams built for you", body: "Pushed across, not typed in." },
  { bg: "#fff", fg: NAVY, border: "#fff", kicker: "Grading", title: "Digital, collated", body: "No paper forms. Ever." },
  { bg: NAVY2, fg: "#fff", border: "rgba(255,255,255,0.12)", kicker: "Registrations", title: "Self-serve", body: "Paid and waivered in one go." },
  { bg: NAVY2, fg: "#fff", border: "rgba(255,255,255,0.12)", kicker: "Fixtures & ladders", title: "Always right", body: "Synced live from the association." },
  { wide: true, bg: "#fff", fg: NAVY, border: "#fff", kicker: "Comms", title: "One place everyone sees", body: "Club, team and parent messages with read receipts. Not a dozen group chats." },
]

function Features() {
  return (
    <section id="features" className={`scroll-mt-[84px] bg-[#001025] ${sectionPad}`}>
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${eyebrow} text-[#00BFAE]`}>What you get</p>
            <h2 className={`${h2} mt-2.5 text-white`} style={{ ...display, ...h2Size }}>
              Every job a club has.
              <br />
              One login.
            </h2>
          </div>
          <p className="max-w-[380px] text-[16px] leading-[1.5] text-[#a5b3c7]">
            Most clubs win back a full working day of volunteer time every week. Here&rsquo;s where it
            comes from.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 [grid-auto-rows:minmax(200px,auto)] sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <a
              key={t.kicker}
              href="#demo"
              className={`${tile} flex flex-col justify-between rounded-[18px] border p-6 ${t.wide ? "sm:col-span-2" : ""}`}
              style={{ background: t.bg, color: t.fg, borderColor: t.border }}
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] opacity-75">{t.kicker}</span>
              <div>
                <p className="text-[34px] font-extrabold uppercase leading-none" style={display}>
                  {t.title}
                </p>
                <p className="mt-2 text-[14px] leading-[1.45] opacity-85">{t.body}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Dimes showcase ─────────────────────────────────────── */
const DIMES_URL = "https://sideline-pro-dimes.vercel.app"
const dimes = [
  { day: "Monday", spots: "8 spots left", color: TEAL, name: "Mini Dimes", meta: "Ages 6–9 · $180 / term" },
  { day: "Monday", spots: "2 spots left", color: "#ffb84d", name: "Development Girls", meta: "Ages 10–14 · $240 / term" },
  { day: "Thursday", spots: "Waitlist", color: "#8fa0b8", name: "Elite Squad", meta: "Ages 14–18 · Selected" },
  { day: "Saturday", spots: "6 spots left", color: TEAL, name: "Saturday Skills", meta: "All ages · Drop-in" },
]

function Dimes() {
  return (
    <section id="dimes" className={`scroll-mt-[84px] bg-white text-[#001025] ${sectionPad}`}>
      <div className={`${container} grid items-center gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]`}>
        <div>
          <p className={`${eyebrow} text-[#008f83]`}>Running on SidelinePro</p>
          <h2 className={`${h2} mt-2.5`} style={{ ...display, ...h2Size }}>
            Don&rsquo;t take our word for it.
            <br />
            <span className="text-[#00BFAE]">Click around one.</span>
          </h2>
          <p className="mt-5 max-w-[480px] text-[17px] leading-[1.55] text-[#4c5b6d]">
            Dimes Basketball Academy runs training groups, Summer League teams, AAU EOIs and overseas
            tours on SidelinePro. Spots update live. Parents register once. Have a look.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <a href={DIMES_URL} target="_blank" rel="noopener" className={`${pill} bg-[#001025] px-7 py-[15px] text-[16px] font-bold text-white`}>
              Open the Dimes site ↗
            </a>
            <a href={`${DIMES_URL}/admin`} target="_blank" rel="noopener" className={`${pill} border-[1.5px] border-[#001025]/25 px-[26px] py-3.5 text-[16px] font-semibold text-[#001025]`}>
              Peek at the admin side ↗
            </a>
          </div>
        </div>
        <a
          href={DIMES_URL}
          target="_blank"
          rel="noopener"
          className={`${tile} block rounded-[22px] bg-[#001025] p-7 text-white shadow-[0_30px_60px_rgba(0,16,37,0.25)]`}
        >
          <div className="flex items-center justify-between">
            <span className="flex flex-col leading-none">
              <span className="text-[30px] font-extrabold tracking-[0.04em]" style={display}>DiMES</span>
              <span className="mt-1 text-[11px] font-semibold tracking-[0.12em] opacity-60">BASKETBALL ACADEMY</span>
            </span>
            <span className="rounded-full border border-[#00BFAE]/40 px-3 py-[5px] text-[12px] font-bold text-[#00BFAE]">Term 4 open</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {dimes.map((p) => (
              <div key={p.name} className="rounded-[14px] border border-white/10 bg-white/[0.06] p-4">
                <div className="flex justify-between gap-2">
                  <span className="text-[12px] text-[#8fa0b8]">{p.day}</span>
                  <span className="text-[11.5px] font-bold" style={{ color: p.color }}>{p.spots}</span>
                </div>
                <p className="mt-1.5 text-[16px] font-bold">{p.name}</p>
                <p className="mt-0.5 text-[12.5px] text-[#a5b3c7]">{p.meta}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[13px] text-[#8fa0b8]">sideline-pro-dimes.vercel.app ↗</p>
        </a>
      </div>
    </section>
  )
}

/* ── Apps ───────────────────────────────────────────────── */
const sports = ["Soccer", "Netball", "AFL", "Rugby League", "Rugby Union", "Cricket", "Basketball", "Hockey", "Touch", "Futsal"]

function Apps() {
  return (
    <section id="apps" className="scroll-mt-[84px] overflow-hidden bg-[#00BFAE] px-5 pt-[72px] text-[#001025] sm:px-7 lg:pt-[100px]">
      <div className={container}>
        <div className="max-w-[640px]">
          <p className={`${eyebrow} opacity-70`}>iOS &amp; Android</p>
          <h2 className={`${h2} mt-2.5`} style={{ ...display, ...h2Size }}>
            Your club.
            <br />
            In every pocket.
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] font-medium leading-[1.55]">
            Players, parents, coaches and officials all see the same fixtures, the same ground changes,
            the same line-up. No more &ldquo;did anyone tell the U12s?&rdquo;
          </p>
          <div className="mt-[26px] flex flex-wrap gap-2">
            {sports.map((sp) => (
              <span key={sp} className="rounded-full bg-[#001025] px-3.5 py-[7px] text-[13px] font-bold text-white">
                {sp}
              </span>
            ))}
          </div>
        </div>
        <figure className="mx-auto mt-10 w-fit text-center">
          <PhoneScreenshot />
          <figcaption className="mt-4 text-xs">Current line-up interface. Image edited for privacy with numbered demo players.</figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ── Demo ───────────────────────────────────────────────── */
function Demo() {
  return (
    <section id="demo" className="scroll-mt-[84px] bg-[#001025] px-5 pb-[72px] pt-[80px] sm:px-7 lg:pb-[100px] lg:pt-[110px]">
      <div className={`${container} grid items-center gap-12 lg:gap-16 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]`}>
        <div>
          <h2 className="font-extrabold uppercase leading-[0.92] text-white" style={{ ...display, fontSize: "clamp(52px,7vw,110px)" }}>
            Show us
            <br />
            your club.
            <br />
            <span className="text-[#00BFAE]">We&rsquo;ll show you Saturday.</span>
          </h2>
          <p className="mt-6 max-w-[460px] text-[17px] leading-[1.55] text-[#a5b3c7]">
            A 20-minute walkthrough built around your teams, your codes and your admin. Rowan replies
            within one business day. A real person, not an auto-responder.
          </p>
          <p className="mt-7 text-[15px] text-[#e6edf7]">
            Rather just email?{" "}
            <a href="mailto:rowan@sidelinepro.com.au" className="font-semibold text-[#00BFAE]">
              rowan@sidelinepro.com.au
            </a>
          </p>
        </div>
        <DemoForm displayFont={display} />
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────── */
const footLinks: [string, string][] = [...navLinks, ["Book a demo", "#demo"]]

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#000a18] px-5 pb-7 pt-10 sm:px-7">
      <div className={`${container} flex flex-wrap items-center justify-between gap-6`}>
        <Lockup height={52} />
        <div className="flex flex-wrap gap-7">
          {footLinks.map(([label, href]) => (
            <a key={label} href={href} className="text-[14px] text-[#a5b3c7] hover:text-[#00BFAE]">
              {label}
            </a>
          ))}
        </div>
      </div>
      <p className={`${container} mt-6 text-[12px] text-[#6c7d96]`}>
        Sydney, Australia · Copyright © {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721
        627. All rights reserved.
      </p>
    </footer>
  )
}

/* Page-scoped keyframes (ticker + live dot); off under reduced motion. */
const css = `
@keyframes sp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes sp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,191,174,.6)}70%{box-shadow:0 0 0 9px rgba(0,191,174,0)}}
.ticker-track{animation:sp-marquee 28s linear infinite}
.live-dot{animation:sp-pulse 1.8s infinite}
@media (prefers-reduced-motion:reduce){.ticker-track,.live-dot{animation:none}}
`

export default function UpdatePreview() {
  return (
    <div className={`${barlow.variable} min-h-screen bg-[#001025] text-[#f2f6fb]`}>
      <style>{css}</style>
      <Navbar />
      <main>
        <Hero />
        <Ticker />
        <Saturday />
        <Features />
        <Dimes />
        <Apps />
        <Demo />
      </main>
      <Footer />
    </div>
  )
}
