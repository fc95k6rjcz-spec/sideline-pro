import Image from "next/image"
import { Poppins } from "next/font/google"
import { Check } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

/* ──────────────────────────────────────────────────────────
   Theme tokens — navy ground, teal accent
   ────────────────────────────────────────────────────────── */
const TEAL_ON_NAVY = "#2dd4bf"

const tealBtn =
  "inline-flex items-center justify-center rounded-lg bg-[#10b3a3] font-medium text-white transition-colors duration-200 hover:bg-[#0d9a8c]"

/* Shared section rhythm. Sections size to their content with the same
   vertical padding, so the page reads as one continuous flow rather than a
   stack of full-screen slides with dead space between them. */
const sectionPad = "px-7 py-20 lg:py-24"
const container = "mx-auto w-full max-w-[1120px]"
const h2Style = {
  fontSize: "clamp(30px,3.4vw,42px)",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
} as const

/* ──────────────────────────────────────────────────────────
   Wordmark — official horizontal logo (dark-background variant)
   ────────────────────────────────────────────────────────── */
function Wordmark({ height = 44 }: { height?: number }) {
  return (
    <Image
      src="/logo-horizontal-dark.svg"
      alt="SidelinePro"
      width={Math.round(height * 3.125)}
      height={height}
      priority
    />
  )
}

/* ──────────────────────────────────────────────────────────
   Nav — 72px fixed, translucent navy + backdrop blur
   ────────────────────────────────────────────────────────── */
const navLinks = [
  ["Features", "#features"],
  ["Solutions", "#solutions"],
  ["Apps", "#apps"],
  ["Contact", "#contact"],
]

function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-white/[0.08] bg-[#0e1a30]/85 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-5 sm:px-7">
        <a href="#top" aria-label="SidelinePro home">
          <Wordmark height={40} />
        </a>
        <div className="flex items-center gap-5 sm:gap-8">
          {/* Anchor links hide on phones (they would overflow); the demo
              button stays so the primary action is always one tap away. */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[15px] font-medium text-[#e6edf7] transition-colors duration-200 hover:text-[#2dd4bf]"
              >
                {label}
              </a>
            ))}
          </div>
          <a href="#contact" className={`${tealBtn} px-4 py-2 text-[14px] sm:px-5 sm:py-2.5`}>
            Book a demo
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ──────────────────────────────────────────────────────────
   Hero — navy, copy left, angled photo right
   ────────────────────────────────────────────────────────── */
const heroProof = ["Works with PlayHQ", "iOS & Android apps", "Every code, every club"]

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#0e1a30] pt-[72px]">
      <div className="relative z-20 mx-auto flex max-w-[1180px] items-center px-7 py-16 lg:min-h-[min(calc(100vh-72px),720px)] lg:py-16">
        <div className="lg:max-w-[560px]">
          <h1
            className="font-bold text-white"
            style={{
              fontSize: "clamp(40px,4.4vw,64px)",
              lineHeight: 1.12,
              letterSpacing: "-0.025em",
            }}
          >
            Less admin.
            <br />
            More time.
            <br />
            Better club sport.
          </h1>
          <p className="mt-6 max-w-[480px] text-[18px] leading-[1.55] text-[#a5b3c7]">
            SidelinePro is club management software for Australian community sport.
            Registrations, fixtures, umpire rostering, grading and comms in one place,
            built for the volunteers who make club sport happen.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-[34px] gap-y-5">
            <a href="#contact" className={`${tealBtn} px-8 py-[14px] text-[17px]`}>
              Book a demo
            </a>
            <a
              href="#features"
              className="border-b-2 border-[#2dd4bf] pb-0.5 text-[17px] font-medium text-[#2dd4bf] transition-opacity hover:opacity-75"
            >
              See what you get back
            </a>
          </div>
          <ul className="mt-10 flex max-w-[440px] flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#8fa0b8]">
            {heroProof.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[#2dd4bf]" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* photo — straight edge on phones, angled left edge pinned right on desktop */}
      <div className="relative min-h-[340px] lg:absolute lg:bottom-0 lg:right-0 lg:top-[72px] lg:min-h-0 lg:w-[56%] lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
        <Image
          src="/hero-netball.png"
          alt="Junior netball game on an indoor court"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 56vw"
          className="object-cover"
        />
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Features / ROI table
   ────────────────────────────────────────────────────────── */
const roster = [
  {
    task: "Umpire & ref rostering",
    old: "Phone calls and a shared spreadsheet, week after week",
    now: "Auto-allocated from who is available",
    save: "~10 hrs a week",
  },
  {
    task: "Building teams in PlayHQ",
    old: "Typed in by hand, one player at a time",
    now: "Built and pushed across for you",
    save: "Hours a season",
  },
  {
    task: "Player grading",
    old: "Paper forms, manual collating",
    now: "In-app digital grading, automatically collated",
    save: "Hours a season",
  },
  {
    task: "Registrations",
    old: "Paper forms, then chasing the payments",
    now: "Self-serve sign-up, all in one list",
    save: "Days a season",
  },
  {
    task: "Fixtures & ladders",
    old: "Copied over from the association by hand",
    now: "Synced live, always correct",
    save: "Hours a week",
  },
  {
    task: "Club & team comms",
    old: "A dozen group chats, emails and texts",
    now: "One place everyone actually sees",
    save: "Hours a week",
  },
  {
    task: "Website updates",
    old: "Chasing the one tech-savvy parent",
    now: "Looks after itself",
    save: "Hours a month",
  },
]

const COLS = "grid-cols-[1.1fr_1.35fr_1.55fr_1fr]"

function FeaturesTable() {
  return (
    <section id="features" className={`relative scroll-mt-[72px] overflow-hidden bg-white ${sectionPad}`}>
      {/* decorative teal blob */}
      <div
        className="pointer-events-none absolute -right-[120px] -top-[140px] h-[620px] w-[620px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(16,179,163,0.07), rgba(16,179,163,0) 70%)",
        }}
        aria-hidden
      />
      <div className={`relative ${container}`}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#10b3a3]">
          Features
        </p>
        <h2 className="mt-2 font-bold text-[#16233d]" style={h2Style}>
          What SidelinePro gives back
        </h2>
        <p className="mt-3 max-w-[600px] text-[16px] leading-[1.55] text-[#5b6b7c]">
          Every hour a committee spends on admin is an hour not spent on the club. Here is where
          that time goes today, and where it comes back.
        </p>

        <div className="mt-8 overflow-x-auto rounded-xl shadow-[0_6px_24px_rgba(22,35,61,0.06)]">
          <div className="min-w-[720px]">
            {/* header */}
            <div className={`grid ${COLS} gap-5 bg-[#eef2f4] px-7 py-[15px]`}>
              {["Task", "The old way", "With SidelinePro", "Time back"].map((h, i) => (
                <span
                  key={h}
                  className={`text-[11.5px] font-semibold uppercase tracking-[0.09em] text-[#7a8798] ${
                    i === 3 ? "text-right" : ""
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            {/* rows — highlight follows the cursor */}
            {roster.map((r) => (
              <div
                key={r.task}
                className={`grid ${COLS} items-center gap-5 border-b border-l-4 border-[#16233d]/[0.06] border-l-transparent py-3 pl-6 pr-7 transition-colors duration-150 hover:border-l-[#10b3a3] hover:bg-[#eaf7f3]`}
              >
                <span className="text-[15.5px] font-semibold text-[#16233d]">{r.task}</span>
                <span className="text-[14px] leading-[1.45] text-[#8a95a3]">{r.old}</span>
                <span className="flex items-baseline gap-[9px] text-[14px] leading-[1.45] text-[#3d4a5c]">
                  <Check className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-[#10b3a3]" strokeWidth={3} />
                  <span>{r.now}</span>
                </span>
                <span className="text-right text-[14px] font-semibold text-[#10b3a3]">{r.save}</span>
              </div>
            ))}
          </div>
        </div>

        {/* add-it-up band */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-6 rounded-xl bg-[#16233d] px-8 py-5">
          <p
            className="font-semibold text-white"
            style={{ fontSize: "clamp(18px,2vw,22px)", letterSpacing: "-0.01em" }}
          >
            Add it up: most clubs win back{" "}
            <span style={{ color: TEAL_ON_NAVY }}>a full working day, every single week.</span>
          </p>
          <a href="#contact" className={`${tealBtn} whitespace-nowrap px-6 py-[11px] text-[15px]`}>
            Book a demo
          </a>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Solutions — navy, card grid + sport chips
   ────────────────────────────────────────────────────────── */
const tiles = [
  {
    kicker: "Website & apps",
    title: "A club site that looks after itself",
    body: "A tidy website plus iOS & Android apps that update on their own. No club webmaster, no late-night HTML.",
  },
  {
    kicker: "Fixtures & ladders",
    title: "Always right, never copied",
    body: "Synced straight from your association, so the draw and the ladder are always up to date.",
  },
  {
    kicker: "Umpires & refs",
    title: "Match-day rostering",
    body: "Sort umpires and refs in minutes, not a whole Sunday of phone calls.",
  },
  {
    kicker: "Teams & players",
    title: "One tidy list",
    body: "Registrations, profiles and who is available, all in one place.",
  },
  {
    kicker: "Messages",
    title: "One place to talk",
    body: "Club, team and parent messages that actually get seen.",
  },
  {
    kicker: "PlayHQ helper",
    title: "Teams built for you",
    body: "A helper that answers committee questions and builds your teams into PlayHQ.",
  },
]

const sports = [
  "Soccer",
  "Netball",
  "AFL",
  "Rugby League",
  "Rugby Union",
  "Cricket",
  "Basketball",
  "Hockey",
  "Touch",
  "Futsal",
]

function Solutions() {
  return (
    <section id="solutions" className={`scroll-mt-[72px] bg-[#121f38] ${sectionPad}`}>
      <div className={container}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2dd4bf]">
          Solutions
        </p>
        <h2 className="mt-2 font-bold text-white" style={h2Style}>
          Everything your club needs
        </h2>
        <p className="mt-3 max-w-[560px] text-[16px] leading-[1.55] text-[#a5b3c7]">
          One login instead of the spreadsheets, the group chats and the Sunday-night guesswork.
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <div
              key={t.kicker}
              className="rounded-xl border border-white/[0.08] bg-[#16233d] px-7 py-[30px] transition-[transform,box-shadow] duration-[350ms] ease-[cubic-bezier(.2,.6,.2,1)] hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(0,0,0,0.4)]"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#2dd4bf]">
                {t.kicker}
              </p>
              <h3
                className="mt-2.5 text-[20px] font-semibold leading-[1.25] text-white"
                style={{ letterSpacing: "-0.01em" }}
              >
                {t.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[#a5b3c7]">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2.5">
          <span className="mr-2 text-[14px] font-semibold text-white">Every code:</span>
          {sports.map((sp) => (
            <span
              key={sp}
              className="rounded-full border border-white/[0.14] bg-white/[0.05] px-4 py-[7px] text-[13.5px] font-medium text-[#d5deeb]"
            >
              {sp}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Mobile apps — white, centred showcase
   ────────────────────────────────────────────────────────── */
const appScreens = [
  { src: "/app-club-white.png", alt: "Club dashboard app screen", height: 1479, raised: false },
  { src: "/app-lineup-white.png", alt: "Coach line-up builder app screen", height: 1484, raised: true },
  { src: "/app-player-white.png", alt: "Player profile app screen", height: 1484, raised: false },
]

function MobileApps() {
  return (
    <section id="apps" className={`scroll-mt-[72px] overflow-hidden bg-white ${sectionPad} pb-0 lg:pb-0`}>
      <div className={`${container} text-center`}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#10b3a3]">
          Mobile apps
        </p>
        <h2 className="mt-2 font-bold text-[#16233d]" style={h2Style}>
          Your club. In your pocket.
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[1.55] text-[#5b6b7c]">
          Native iOS &amp; Android apps for players, parents, coaches and officials, so everyone
          stays on top of game day.
        </p>

        {/* Phones sit on the section's bottom edge so the screenshots feel
            anchored rather than floating in white space. */}
        <div className="mx-auto mt-12 grid max-w-[820px] grid-cols-3 items-end gap-4 sm:gap-6">
          {appScreens.map((s) => (
            <div key={s.src} className={s.raised ? "mb-8" : ""}>
              <Image
                src={s.src}
                alt={s.alt}
                width={853}
                height={s.height}
                sizes="(max-width: 880px) 33vw, 280px"
                className="block h-auto w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Contact — navy, what-happens-next + existing ContactForm
   ────────────────────────────────────────────────────────── */
const nextSteps = [
  { title: "Tell us about your club", body: "A few details on the form is plenty." },
  { title: "We reply within one business day", body: "A real person, not an auto-responder." },
  { title: "See it with your club in mind", body: "A walkthrough built around your teams, your codes and your admin." },
]

function Contact() {
  return (
    <section id="contact" className={`scroll-mt-[72px] bg-[#121f38] ${sectionPad}`}>
      <div className={`${container} grid items-start gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16`}>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2dd4bf]">
            Contact
          </p>
          <h2 className="mt-2 font-bold text-white" style={h2Style}>
            Tell us about your club
          </h2>
          <p className="mt-3 max-w-[420px] text-[16px] leading-[1.55] text-[#a5b3c7]">
            Book a demo or just ask a question. Here is what happens next.
          </p>

          <ol className="mt-8 flex flex-col gap-5">
            {nextSteps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 text-[13px] font-semibold text-[#2dd4bf]">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15.5px] font-semibold text-white">{s.title}</p>
                  <p className="mt-0.5 text-[14.5px] leading-[1.5] text-[#a5b3c7]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-9 border-t border-white/[0.08] pt-6">
            <p className="text-[15px] text-[#e6edf7]">Sydney, Australia</p>
            <a
              href="mailto:rowan@sidelinepro.com.au"
              className="mt-1 inline-block text-[15px] font-medium text-[#2dd4bf] hover:opacity-75"
            >
              rowan@sidelinepro.com.au
            </a>
            <p className="mt-4 text-[12.5px] text-[#7b8aa0]">Sideline Pro Pty Ltd · ACN 697 721 627</p>
          </div>
        </div>

        {/* Existing ContactForm — wired to /api/contact. Wrapped in a light card
            so its labels/inputs stay legible against the navy section. */}
        <div className="rounded-xl bg-white p-6 shadow-[0_12px_34px_rgba(0,0,0,0.35)] sm:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Footer — deep navy, link columns
   ────────────────────────────────────────────────────────── */
const footCols: { head: string; links: [string, string][] }[] = [
  {
    head: "Explore",
    links: [
      ["Features", "#features"],
      ["Solutions", "#solutions"],
      ["Apps", "#apps"],
      ["Contact", "#contact"],
    ],
  },
  {
    head: "Get in touch",
    links: [
      ["rowan@sidelinepro.com.au", "mailto:rowan@sidelinepro.com.au"],
      ["Book a demo", "#contact"],
    ],
  },
]

function Footer() {
  return (
    <footer className="bg-[#0a1426] px-7 pb-[26px] pt-12">
      <div className={container}>
        <div className="grid gap-6 border-b border-white/[0.12] pb-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Wordmark height={36} />
            <p className="mt-3 max-w-[230px] text-[13px] leading-[1.55] text-[#8fa0b8]">
              Designed and shipped from Sydney for Australian community clubs.
            </p>
          </div>
          {footCols.map((c) => (
            <div key={c.head}>
              <p className="mb-2.5 text-[12.5px] font-semibold text-white">{c.head}</p>
              {c.links.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="mb-[7px] block text-[12.5px] text-[#8fa0b8] transition-colors hover:text-[#2dd4bf]"
                >
                  {label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <p className="pt-[18px] text-[12px] text-[#6c7d96]">
          Copyright © {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721 627. All rights
          reserved.
        </p>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <div className={`${poppins.className} min-h-screen bg-[#0e1a30] text-[#f2f6fb]`}>
      <Navbar />
      <main>
        <Hero />
        <FeaturesTable />
        <Solutions />
        <MobileApps />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
