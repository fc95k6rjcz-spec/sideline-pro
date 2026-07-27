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
const TEAL = "#10b3a3"
const TEAL_ON_NAVY = "#2dd4bf"

const tealBtn =
  "inline-flex items-center justify-center rounded-lg bg-[#10b3a3] font-medium text-white transition-colors duration-200 hover:bg-[#0d9a8c]"

/* ──────────────────────────────────────────────────────────
   Wordmark — text "Sideline" + teal "Pro"
   ────────────────────────────────────────────────────────── */
function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span
      style={{ fontSize: size, fontWeight: 700, letterSpacing: "-0.02em" }}
      className="text-white"
    >
      Sideline<span style={{ color: TEAL_ON_NAVY }}>Pro</span>
    </span>
  )
}

/* ──────────────────────────────────────────────────────────
   Nav — 72px fixed, translucent navy + backdrop blur
   ────────────────────────────────────────────────────────── */
const navLinks = [
  ["Features", "#features"],
  ["Solutions", "#solutions"],
  ["About", "#about"],
  ["Contact", "#contact"],
]

function Navbar() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-white/[0.08] bg-[#0e1a30]/85 backdrop-blur-lg backdrop-saturate-150"
    >
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-7">
        <a href="#top">
          <Wordmark />
        </a>
        <div className="flex items-center gap-6 sm:gap-9">
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
      </div>
    </nav>
  )
}

/* ──────────────────────────────────────────────────────────
   Hero — navy, 46/54 split, angled photo
   ────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#0e1a30] pt-[72px]">
      <div className="grid items-stretch lg:min-h-[640px] lg:grid-cols-[46%_54%]">
        {/* copy */}
        <div className="flex w-full max-w-[640px] flex-col justify-center justify-self-end px-7 py-16 lg:py-[70px]">
          <div className="lg:pl-7">
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
            <p className="mt-[22px] max-w-[420px] text-[19px] leading-[1.5] text-[#a5b3c7]">
              Built for the people who make club sport happen.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-[34px] gap-y-5">
              <a href="#contact" className={`${tealBtn} px-8 py-[14px] text-[17px]`}>
                Book a demo
              </a>
              <a
                href="#features"
                className="border-b-2 border-[#2dd4bf] pb-0.5 text-[17px] font-medium text-[#2dd4bf] transition-opacity hover:opacity-75"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>

        {/* photo — angled left edge */}
        <div
          className="relative min-h-[360px] lg:min-h-0"
          style={{ clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" }}
        >
          <Image
            src="/hero-netball.png"
            alt="Junior netball game on an indoor court"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Features / ROI table
   ────────────────────────────────────────────────────────── */
const HIGHLIGHT = "Player Grading"

const roster = [
  {
    task: "Umpire & ref rostering",
    old: "Phone calls and a shared spreadsheet, week after week",
    now: "Auto-allocated from who is available",
    save: "~10 hrs/wk",
  },
  {
    task: "Building teams in PlayHQ",
    old: "Typed in by hand, one player at a time",
    now: "Built and pushed across for you",
    save: "Hours a season",
  },
  {
    task: "Player Grading",
    old: "Paper forms, manual collating",
    now: "In-app digital grading, automatically collated",
    save: "Countless hours each season",
  },
  {
    task: "Registrations",
    old: "Paper forms, then chasing the payments",
    now: "Self-serve sign-up, all in one list",
    save: "Days of admin",
  },
  {
    task: "Fixtures & ladders",
    old: "Copied over from the association by hand",
    now: "Synced live, always correct",
    save: "Every week",
  },
  {
    task: "Club & team comms",
    old: "A dozen group chats, emails and texts",
    now: "One place everyone actually sees",
    save: "Every day",
  },
  {
    task: "Website updates",
    old: "Chasing the one tech-savvy parent",
    now: "Looks after itself",
    save: "Ongoing",
  },
]

const COLS = "grid-cols-[1.1fr_1.35fr_1.55fr_1fr]"

function FeaturesTable() {
  return (
    <section id="features" className="relative overflow-hidden bg-white px-7 py-[92px]">
      {/* decorative teal blob */}
      <div
        className="pointer-events-none absolute -right-[120px] -top-[140px] h-[620px] w-[620px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(16,179,163,0.07), rgba(16,179,163,0) 70%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1120px]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#10b3a3]">
          Features
        </p>
        <h2
          className="mt-2 font-bold text-[#16233d]"
          style={{ fontSize: "clamp(30px,3.4vw,42px)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
        >
          What SidelinePro gives back
        </h2>
        <p className="mt-2 text-[16px] leading-[1.5] text-[#5b6b7c]">
          Less chasing, less repeating and more time for the people who make club sport happen.
        </p>

        <div className="mt-7 overflow-x-auto rounded-xl shadow-[0_6px_24px_rgba(22,35,61,0.06)]">
          <div className="min-w-[720px]">
            {/* header */}
            <div className={`grid ${COLS} gap-5 bg-[#eef2f4] px-7 py-[15px]`}>
              {["Task", "The old way", "With Sideline Pro", "Time back"].map((h, i) => (
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
            {/* rows */}
            {roster.map((r) => {
              const highlighted = r.task === HIGHLIGHT
              return (
                <div
                  key={r.task}
                  className={`grid ${COLS} items-center gap-5 border-b border-[#16233d]/[0.06] py-[19px] pl-6 pr-7`}
                  style={{
                    background: highlighted ? "#eaf7f3" : "transparent",
                    borderLeft: `4px solid ${highlighted ? TEAL : "transparent"}`,
                  }}
                >
                  <span className="text-[15.5px] font-semibold text-[#16233d]">{r.task}</span>
                  <span className="text-[14px] leading-[1.45] text-[#8a95a3]">{r.old}</span>
                  <span className="flex items-baseline gap-[9px] text-[14px] leading-[1.45] text-[#3d4a5c]">
                    <Check className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-[#10b3a3]" strokeWidth={3} />
                    <span>{r.now}</span>
                  </span>
                  <span className="text-right text-[14px] font-semibold text-[#10b3a3]">{r.save}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* add-it-up band */}
        <div className="mt-[26px] flex flex-wrap items-center justify-between gap-6 rounded-xl bg-[#16233d] px-8 py-[26px]">
          <p
            className="font-semibold text-white"
            style={{ fontSize: "clamp(18px,2vw,22px)", letterSpacing: "-0.01em" }}
          >
            Add it up — most clubs win back{" "}
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
    body: "A tidy website plus iOS & Android apps that update on their own — no club webmaster, no late-night HTML.",
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
    body: "Registrations, profiles and who is available — all in one place.",
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
    <section id="solutions" className="border-t border-white/[0.06] bg-[#121f38] px-7 py-[92px]">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2dd4bf]">
          Solutions
        </p>
        <h2
          className="mt-2 font-bold text-white"
          style={{ fontSize: "clamp(30px,3.4vw,42px)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
        >
          Everything your club needs
        </h2>
        <p className="mt-2 max-w-[560px] text-[16px] leading-[1.5] text-[#a5b3c7]">
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
   About / Mobile apps — white, centered
   ────────────────────────────────────────────────────────── */
const appScreens = [
  { src: "/app-club-white.png", alt: "Club dashboard app screen", raised: false },
  { src: "/app-lineup-white.png", alt: "Coach line-up builder app screen", raised: true },
  { src: "/app-player-white.png", alt: "Player profile app screen", raised: false },
]

function MobileApps() {
  return (
    <section id="about" className="overflow-hidden bg-white px-7 pb-[70px] pt-[92px]">
      <div className="mx-auto max-w-[1120px] text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#10b3a3]">
          Mobile apps
        </p>
        <h2
          className="mt-2 font-bold text-[#16233d]"
          style={{ fontSize: "clamp(30px,3.4vw,42px)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
        >
          Your club. In your pocket.
        </h2>
        <div className="mx-auto mt-4 h-[3px] w-14 rounded-sm bg-[#10b3a3]" />
        <p className="mx-auto mt-3.5 max-w-[560px] text-[16px] leading-[1.5] text-[#5b6b7c]">
          Native iOS &amp; Android apps for players, parents, coaches and officials — so everyone stays
          on top of game day.
        </p>

        <div className="mx-auto mt-[52px] grid max-w-[880px] grid-cols-3 items-end gap-6">
          {appScreens.map((s) => (
            <div key={s.src} className={s.raised ? "mb-8" : ""}>
              <Image
                src={s.src}
                alt={s.alt}
                width={853}
                height={1484}
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
   Contact — navy, info + existing ContactForm
   ────────────────────────────────────────────────────────── */
function Contact() {
  return (
    <section id="contact" className="border-t border-white/[0.06] bg-[#121f38] px-7 py-[92px]">
      <div className="mx-auto grid max-w-[1120px] items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2dd4bf]">
            Contact
          </p>
          <h2
            className="mt-2 font-bold text-white"
            style={{ fontSize: "clamp(30px,3.4vw,42px)", lineHeight: 1.15, letterSpacing: "-0.02em" }}
          >
            Tell us about your club
          </h2>
          <p className="mt-3.5 max-w-[420px] text-[16px] leading-[1.55] text-[#a5b3c7]">
            We&apos;ll get back to you within a day with pricing for your club and a time to show you
            around — no hard sell.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <p className="text-[15.5px] text-[#e6edf7]">Sydney, Australia</p>
            <a
              href="mailto:rowan@sidelinepro.com.au"
              className="text-[15.5px] font-medium text-[#2dd4bf] hover:opacity-75"
            >
              rowan@sidelinepro.com.au
            </a>
          </div>
          <p className="mt-[26px] text-[12.5px] text-[#7b8aa0]">
            Sideline Pro Pty Ltd · ACN 697 721 627
          </p>
        </div>

        {/* Existing ContactForm — wired to /api/contact. Wrapped in a light card
            so its labels/inputs stay legible against the navy section. */}
        <div className="rounded-xl bg-white p-8 shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
          <ContactForm />
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Footer — deep navy, link columns
   ────────────────────────────────────────────────────────── */
const footCols = [
  { head: "Product", links: ["Websites", "Mobile apps", "Fixtures & ladders", "Umpire management"] },
  { head: "Platform", links: ["Teams & players", "Communications", "Reports", "Payments"] },
  { head: "Company", links: ["About", "Pricing", "Contact"] },
  { head: "Support", links: ["Help centre", "Onboarding", "Status", "Privacy"] },
]

function Footer() {
  return (
    <footer className="bg-[#0a1426] px-7 pb-[26px] pt-12">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid gap-6 border-b border-white/[0.12] pb-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size={22} />
            <p className="mt-3 max-w-[230px] text-[13px] leading-[1.55] text-[#8fa0b8]">
              Designed and shipped from Sydney for Australian community clubs.
            </p>
          </div>
          {footCols.map((c) => (
            <div key={c.head}>
              <p className="mb-2.5 text-[12.5px] font-semibold text-white">{c.head}</p>
              {c.links.map((l) => (
                <a
                  key={l}
                  href="#contact"
                  className="mb-[7px] block text-[12.5px] text-[#8fa0b8] transition-colors hover:text-[#2dd4bf]"
                >
                  {l}
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
