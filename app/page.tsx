import type { ReactNode } from "react"
import Image from "next/image"
import { ContactForm } from "@/components/contact-form"
import {
  Globe,
  Smartphone,
  CalendarDays,
  Users,
  UserCheck,
  MessageSquare,
  BarChart3,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  ArrowRight,
  LayoutDashboard,
  Building2,
  User,
  Trophy,
  CreditCard,
  Settings,
  Menu,
  Tag,
  Wifi,
  Signal,
  BatteryFull,
  ChevronRight,
} from "lucide-react"

/* ──────────────────────────────────────────────────────────
   Theme tokens — black canvas, gold accent
   ────────────────────────────────────────────────────────── */
const pageBg = "bg-white"
const cardBg = "bg-white"
const insetBg = "bg-[#f5f5f7]"
const hairline = "border-black/10"
const muted = "text-[#6e6e73]"
const goldGrad = "linear-gradient(135deg,#D4A857 0%,#BD8A2C 60%,#9A6E1F 100%)"

const goldBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#BD8A2C] font-medium text-white transition-opacity hover:opacity-90"
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-black/15 font-medium text-[#1d1d1f] transition-colors hover:bg-black/[0.04]"

/* ──────────────────────────────────────────────────────────
   Brand mark — angular gold S
   ────────────────────────────────────────────────────────── */
function SMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden role="img">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D4A857" />
          <stop offset="0.6" stopColor="#BD8A2C" />
          <stop offset="1" stopColor="#9A6E1F" />
        </linearGradient>
      </defs>
      <path
        fill="url(#sg)"
        d="M55 6 H26 C15 6 7 13 7 24 C7 33 13 39 24 40 L37 41.5 C41 42 43 43.5 43 47 C43 51 39 53 31 53 H6 V60 H33 C46 60 56 53 56 42 C56 32 49 26 37 25 L24 23.5 C20 23 18 21.5 18 18 C18 14 22 13 30 13 H55 Z"
      />
    </svg>
  )
}

function Logo({ size = "nav" }: { size?: "nav" | "footer" }) {
  const mark = size === "footer" ? "h-11 w-11" : "h-10 w-10"
  const word = size === "footer" ? "text-2xl" : "text-xl sm:text-2xl"
  return (
    <a href="/" className="inline-flex items-center gap-3">
      <SMark className={mark} />
      <span className="h-9 w-px shrink-0 bg-black/10" aria-hidden />
      <span className="flex flex-col leading-none">
        <span className={`${word} font-semibold tracking-tight text-[#1d1d1f]`}>
          SIDELINE <span className="text-[#BD8A2C]">PRO</span>
        </span>
        <span className="mt-1.5 hidden text-[9px] font-medium uppercase tracking-[0.24em] text-[#86868b] sm:inline">
          Club Management, Unleashed
        </span>
      </span>
    </a>
  )
}

/* ──────────────────────────────────────────────────────────
   Navbar
   ────────────────────────────────────────────────────────── */
function NavLink({ children, href, caret }: { children: ReactNode; href: string; caret?: boolean }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wide text-[#1d1d1f] transition-colors hover:text-[#1d1d1f]"
    >
      {children}
      {caret && <ChevronDown className="h-3.5 w-3.5 text-[#86868b]" />}
    </a>
  )
}

function Navbar() {
  return (
    <nav className={`fixed top-0 z-50 w-full border-b ${hairline} bg-white/80 backdrop-blur-md`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <Logo />
        <div className="hidden items-center gap-9 lg:flex">
          <NavLink href="/">Product</NavLink>
          <NavLink href="#contact">Pricing</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className={`${ghostBtn} hidden whitespace-nowrap px-6 py-2.5 text-[13px] sm:inline-flex`}>
            Login
          </a>
          <a href="#contact" className={`${goldBtn} whitespace-nowrap px-4 py-2.5 text-[13px] sm:px-6`}>
            Book a Demo
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ──────────────────────────────────────────────────────────
   Shared mockup bits
   ────────────────────────────────────────────────────────── */
function Crest({ from, to }: { from: string; to: string }) {
  return (
    <span
      className="inline-block h-5 w-5 shrink-0 rounded-full ring-1 ring-white/15"
      style={{ background: `linear-gradient(135deg,${from},${to})` }}
      aria-hidden
    />
  )
}

const seaforth = { from: "#1d4ed8", to: "#0b2a6b" }
const manly = { from: "#7f1d1d", to: "#3f0d0d" }

/* ──────────────────────────────────────────────────────────
   MacBook dashboard mockup
   ────────────────────────────────────────────────────────── */
function LaptopMockup() {
  const nav: [typeof LayoutDashboard, string][] = [
    [LayoutDashboard, "Dashboard"],
    [Building2, "My Club"],
    [Users, "Teams"],
    [User, "Players"],
    [CalendarDays, "Fixtures"],
    [Trophy, "Ladders"],
    [UserCheck, "Umpires"],
    [MessageSquare, "Communications"],
    [BarChart3, "Reports"],
    [CreditCard, "Payments"],
    [Settings, "Settings"],
  ]
  const stats = [
    ["Upcoming Fixtures", "12", "View all fixtures"],
    ["Unread Messages", "5", "View messages"],
    ["Umpire Shortages", "3", "Manage umpires"],
    ["Tasks To Do", "7", "View tasks"],
  ]
  const ladder = [
    ["1", "Seaforth NC", "8", "32"],
    ["2", "Manly Warringah", "8", "28"],
    ["3", "Northern Beaches", "8", "24"],
    ["4", "Allambie", "8", "16"],
  ]
  return (
    <div className="w-full">
      {/* screen */}
      <div className="overflow-hidden rounded-xl border-[5px] border-[#262626] bg-[#0D0D0D] shadow-2xl shadow-black/60">
        <div className="flex">
          {/* sidebar */}
          <div className={`w-[30%] border-r ${hairline} bg-[#0B0B0B] p-2.5`}>
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <SMark className="h-4 w-4" />
              <span className="text-[9px] font-bold text-[#1d1d1f]">SIDELINE PRO</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {nav.map(([Icon, label], i) => (
                <li
                  key={label}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[8px] font-medium ${
                    i === 0 ? "bg-[#BD8A2C]/15 text-[#BD8A2C]" : "text-[#86868b]"
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          {/* main */}
          <div className="flex-1 p-3.5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#1d1d1f]">Welcome back, Seaforth Netball Club 👋</p>
                <p className="text-[7.5px] text-[#86868b]">Here&apos;s what&apos;s happening at your club today.</p>
              </div>
              <Settings className="h-3 w-3 text-[#86868b]" />
            </div>
            <div className="mb-2.5 grid grid-cols-4 gap-1.5">
              {stats.map(([label, value, link]) => (
                <div key={label} className={`rounded-lg border ${hairline} ${insetBg} p-2`}>
                  <p className="text-[6px] font-semibold uppercase tracking-wide text-[#86868b]">{label}</p>
                  <p className="mt-1 text-lg font-bold leading-none text-[#1d1d1f]">{value}</p>
                  <p className="mt-1.5 text-[6px] font-medium text-[#BD8A2C]">{link} →</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* next fixture */}
              <div className={`rounded-lg border ${hairline} ${insetBg} p-2.5`}>
                <p className="text-[7px] font-semibold uppercase tracking-wide text-[#86868b]">Next Fixture</p>
                <p className="mb-2 text-[6.5px] text-[#86868b]">Round 7</p>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <Crest {...seaforth} />
                    <span className="text-[6px] font-semibold leading-tight text-[#1d1d1f]">Seaforth NC</span>
                  </div>
                  <span className="text-[7px] font-bold text-[#86868b]">VS</span>
                  <div className="flex flex-col items-center gap-0.5 text-center">
                    <Crest {...manly} />
                    <span className="text-[6px] font-semibold leading-tight text-[#1d1d1f]">Manly Warringah</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[6px] text-[#6e6e73]">Sat 20 Jun · 9:00 AM</p>
                <p className="text-center text-[6px] text-[#86868b]">Netball Central · Court 3</p>
                <div className="mt-2 rounded-md bg-[#BD8A2C] py-1 text-center text-[7px] font-bold text-black">
                  View Fixture
                </div>
              </div>
              {/* ladder */}
              <div className={`rounded-lg border ${hairline} ${insetBg} p-2.5`}>
                <p className="mb-1.5 text-[7px] font-semibold uppercase tracking-wide text-[#86868b]">Ladder — A Grade</p>
                <div className="mb-1 flex items-center justify-between text-[6px] font-semibold text-[#86868b]">
                  <span>#&nbsp;&nbsp;Team</span>
                  <span className="flex gap-2.5">
                    <span>P</span>
                    <span>PTS</span>
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {ladder.map(([pos, team, p, pts]) => (
                    <li key={team} className="flex items-center justify-between text-[6.5px]">
                      <span className="text-[#3a3a3c]">
                        <span className="mr-1.5 font-bold text-[#BD8A2C]">{pos}</span>
                        {team}
                      </span>
                      <span className="flex gap-2.5 tabular-nums">
                        <span className="text-[#86868b]">{p}</span>
                        <span className="font-bold text-[#1d1d1f]">{pts}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[6px] font-medium text-[#BD8A2C]">View full ladder →</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* base / hinge */}
      <div
        className="relative mx-auto h-2.5 w-[112%] -translate-x-[5.3%] rounded-b-lg"
        style={{ background: "linear-gradient(180deg,#3a3a3a,#161616)" }}
      >
        <div className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-md bg-[#0D0D0D]" />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   iPhone mockup
   ────────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="relative w-[172px] rounded-[2.1rem] border-[7px] border-[#1b1b1b] bg-[#0D0D0D] shadow-2xl shadow-black/70 ring-1 ring-white/[0.06]">
      {/* dynamic island */}
      <div className="absolute left-1/2 top-2 z-10 h-3.5 w-14 -translate-x-1/2 rounded-full bg-black" />
      <div className="overflow-hidden rounded-[1.6rem] px-2.5 pb-3 pt-2.5">
        {/* status bar */}
        <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1.5 text-[#3a3a3c]">
          <span className="text-[7px] font-semibold">9:41</span>
          <span className="flex items-center gap-1">
            <Signal className="h-2 w-2" />
            <Wifi className="h-2 w-2" />
            <BatteryFull className="h-2.5 w-2.5" />
          </span>
        </div>
        {/* app bar */}
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <Menu className="h-3 w-3 text-[#6e6e73]" />
          <span className="flex items-center gap-1">
            <SMark className="h-3 w-3" />
            <span className="text-[7px] font-bold text-[#1d1d1f]">SIDELINE PRO</span>
          </span>
          <span className="h-3 w-3 rounded-full bg-white/10" />
        </div>
        {/* club */}
        <div className={`mb-2.5 flex items-center gap-2 rounded-xl border ${hairline} ${insetBg} p-2`}>
          <Crest {...seaforth} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[7.5px] font-bold text-[#1d1d1f]">Seaforth Netball Club</p>
            <p className="text-[6px] text-[#86868b]">A grade</p>
          </div>
          <ChevronRight className="h-2.5 w-2.5 text-[#86868b]" />
        </div>
        <p className="text-[8.5px] font-bold text-[#1d1d1f]">Welcome back!</p>
        <p className="mb-2.5 text-[6px] text-[#86868b]">Here&apos;s what&apos;s happening today.</p>
        {/* next fixture */}
        <div className={`mb-2.5 rounded-xl border ${hairline} ${insetBg} p-2.5`}>
          <p className="text-[6.5px] font-semibold uppercase tracking-wide text-[#86868b]">Next Fixture</p>
          <p className="mb-2 text-[6px] text-[#86868b]">Round 7</p>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <Crest {...seaforth} />
              <span className="text-[5.5px] text-[#6e6e73]">Seaforth</span>
            </div>
            <span className="text-[6.5px] font-bold text-[#86868b]">VS</span>
            <div className="flex flex-col items-center gap-0.5">
              <Crest {...manly} />
              <span className="text-[5.5px] text-[#6e6e73]">Manly</span>
            </div>
          </div>
          <p className="mt-2 text-center text-[6px] text-[#6e6e73]">Sat 20 Jun · 9:00 AM</p>
          <p className="text-center text-[5.5px] text-[#86868b]">Netball Central · Court 3</p>
          <div className="mt-2 rounded-md bg-[#BD8A2C] py-1 text-center text-[6.5px] font-bold text-black">
            View Fixture
          </div>
        </div>
        <p className="mb-1.5 text-[7.5px] font-bold text-[#1d1d1f]">My Tasks</p>
        <div className="flex flex-col gap-1.5">
          {[
            ["Confirm Umpires", "2 due today"],
            ["Submit Scores", "3 outstanding"],
          ].map(([t, sub]) => (
            <div key={t} className={`flex items-center justify-between rounded-lg border ${hairline} ${insetBg} px-2 py-1.5`}>
              <span>
                <span className="block text-[6.5px] font-medium text-[#1d1d1f]">{t}</span>
                <span className="block text-[5.5px] text-[#86868b]">{sub}</span>
              </span>
              <ArrowRight className="h-2.5 w-2.5 text-[#BD8A2C]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Hero
   ────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className={`relative overflow-hidden pt-32 pb-16 ${pageBg}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 55% at 88% 12%, rgba(224,168,46,0.05), transparent 60%)" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          <div>
            <div className={`mb-7 inline-flex items-center gap-2 rounded-full border ${hairline} bg-[#f5f5f7] px-4 py-1.5`}>
              <Users className="h-3.5 w-3.5 text-[#BD8A2C]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#BD8A2C]">
                Built for community sport
              </span>
            </div>
            <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight text-[#1d1d1f] sm:text-[3.25rem] sm:leading-[1.02] lg:text-[4.5rem]">
              One Platform.
              <br />
              Every Part of
              <br />
              <span
                style={{
                  background: goldGrad,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Your Club.
              </span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-[#6e6e73]">
              Sideline Pro brings your website, app, teams, players, umpires, communications and more into
              one powerful platform — built for clubs, by people who get it.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#contact" className={`${goldBtn} px-7 py-3.5 text-sm`}>
                Book a Demo <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#features" className={`${ghostBtn} px-7 py-3.5 text-sm`}>
                Explore Features
              </a>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-[#6e6e73]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#BD8A2C]/15">
                <Check className="h-3 w-3 text-[#BD8A2C]" strokeWidth={3} />
              </span>
              Trusted by clubs across Australia
            </div>
          </div>

          {/* device cluster */}
          <div className="relative lg:justify-self-end">
            <Image
              src="/hero-dashboard.png"
              alt="Sideline Pro club dashboard shown on laptop and mobile"
              width={1780}
              height={984}
              priority
              className="h-auto w-full max-w-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Feature icon row
   ────────────────────────────────────────────────────────── */
const features = [
  { icon: Globe, title: "Modern Club Websites", body: "Beautiful, mobile-first sites that update automatically." },
  { icon: Smartphone, title: "Native Mobile Apps", body: "iOS & Android apps for players, parents, coaches & officials." },
  { icon: CalendarDays, title: "Fixtures & Ladders", body: "Real-time fixtures, results & ladders synced with your association." },
  { icon: Users, title: "Teams & Players", body: "Manage teams, player profiles, registrations and availability." },
  { icon: Tag, title: "Umpire Management", body: "Automate allocations, track availability & reduce admin by hours." },
  { icon: MessageSquare, title: "Communications", body: "Instant messaging, announcements & targeted notifications." },
  { icon: BarChart3, title: "Reports & Insights", body: "Powerful reporting to help your club make better decisions." },
]

function FeatureRow() {
  return (
    <section id="features" className={`border-y ${hairline} ${pageBg} py-16`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 text-center sm:grid-cols-3 lg:grid-cols-7 lg:gap-x-4">
          {features.map((f) => (
            <div key={f.title}>
              <f.icon className="mx-auto mb-4 h-8 w-8 text-[#BD8A2C]" strokeWidth={1.5} />
              <p className="mb-1.5 text-sm font-bold text-[#1d1d1f]">{f.title}</p>
              <p className="text-xs leading-relaxed text-[#86868b]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   All-in-one platform + stats
   ────────────────────────────────────────────────────────── */
function MiniCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border ${hairline} ${insetBg} p-3`}>
      <p className="mb-2 text-[10px] font-bold text-[#1d1d1f]">{title}</p>
      {children}
    </div>
  )
}

function Avatar({ c, size = "h-6 w-6" }: { c: string; size?: string }) {
  return <span className={`${size} shrink-0 rounded-full ring-1 ring-white/15`} style={{ background: c }} aria-hidden />
}

const avatarA = [
  "linear-gradient(135deg,#3b82f6,#1e3a8a)",
  "linear-gradient(135deg,#f59e0b,#b45309)",
  "linear-gradient(135deg,#10b981,#065f46)",
  "linear-gradient(135deg,#ec4899,#9d174d)",
  "linear-gradient(135deg,#8b5cf6,#5b21b6)",
]
const avatarB = [
  "linear-gradient(135deg,#06b6d4,#0e7490)",
  "linear-gradient(135deg,#ef4444,#991b1b)",
  "linear-gradient(135deg,#84cc16,#3f6212)",
  "linear-gradient(135deg,#f97316,#9a3412)",
  "linear-gradient(135deg,#a855f7,#6b21a8)",
]

function AustraliaMap({ className = "h-12 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden role="img">
      <path
        fill="currentColor"
        d="M48 52 L60 40 L68 52 L82 38 L96 46 L110 40 L120 52 L140 58 L158 74 L168 96 L160 110 L150 116 L138 128 L120 132 L98 128 C84 126 72 120 58 126 L40 120 L30 104 L26 84 L34 66 Z"
      />
      <path fill="currentColor" d="M126 146 l8 -4 l4 8 l-8 6 z" />
    </svg>
  )
}

function AllInOne() {
  const checklist = [
    "Save 5–10 hours of admin every week",
    "Reduce manual work and errors",
    "Engage members and grow participation",
    "Built with security, privacy and reliability",
  ]
  return (
    <section id="all-in-one" className={`${pageBg} py-20`}>
      <div className="mx-auto max-w-7xl px-6">
        <div
          className={`overflow-hidden rounded-3xl border ${hairline} p-8 sm:p-12`}
          style={{ background: "linear-gradient(135deg,#101010 0%,#171310 100%)" }}
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#BD8A2C]">
                All-in-one platform
              </span>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-4xl">
                Everything your club
                <br />
                needs. All in one place.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-[#6e6e73]">
                Sideline Pro replaces multiple tools and spreadsheets with a single platform that saves
                time, reduces admin and helps your club thrive.
              </p>
              <ul className="mt-7 flex flex-col gap-3.5">
                {checklist.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#BD8A2C]/15">
                      <Check className="h-3 w-3 text-[#BD8A2C]" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-[#3a3a3c]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* mockup collage */}
            <div className="flex flex-col gap-3 self-center">
              <div className="grid grid-cols-2 gap-3">
                <MiniCard title="Teams">
                  <div className="flex flex-col gap-2">
                    {[
                      ["A Grade", avatarA],
                      ["B Grade", avatarB],
                    ].map(([g, colors]) => (
                      <div key={g as string}>
                        <p className="mb-1 text-[8px] text-[#86868b]">{g}</p>
                        <div className="flex gap-1">
                          {(colors as string[]).map((c, i) => (
                            <Avatar key={i} c={c} size="h-5 w-5" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </MiniCard>
                <MiniCard title="Umpires">
                  <ul className="flex flex-col gap-2">
                    {[
                      ["Jessica M.", "Available", avatarA[3]],
                      ["Sarah T.", "Committed", avatarB[1]],
                      ["Emily R.", "Available", avatarA[2]],
                    ].map(([u, status, c]) => (
                      <li key={u} className="flex items-center gap-1.5">
                        <Avatar c={c} size="h-5 w-5" />
                        <span className="text-[8px] text-[#3a3a3c]">{u}</span>
                        <span className={`ml-auto text-[7px] ${status === "Available" ? "text-[#BD8A2C]" : "text-[#86868b]"}`}>
                          {status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </MiniCard>
              </div>

              {/* club website hero — stadium look */}
              <div className={`relative min-h-[150px] overflow-hidden rounded-xl border ${hairline} shadow-xl shadow-black/50`}>
                {/* stadium base */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(110% 70% at 50% -15%, rgba(150,200,235,0.6), transparent 45%), radial-gradient(70% 50% at 50% -5%, rgba(224,168,46,0.22), transparent 60%), radial-gradient(90% 45% at 50% 120%, rgba(34,84,64,0.55), transparent 60%), linear-gradient(180deg,#173b50 0%,#0e2735 38%,#08151d 68%,#050a0e 100%)",
                  }}
                  aria-hidden
                />
                {/* floodlight beams */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.10) 48%, transparent 56%), linear-gradient(255deg, transparent 40%, rgba(255,255,255,0.08) 48%, transparent 56%)",
                  }}
                  aria-hidden
                />
                {/* crowd texture */}
                <div
                  className="absolute inset-x-0 top-0 h-1/2 opacity-[0.12]"
                  style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.6px)", backgroundSize: "5px 5px" }}
                  aria-hidden
                />
                {/* bottom scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden />

                <div className="relative flex h-full flex-col p-3">
                  <div className="mb-auto flex items-center justify-between">
                    <span className="grid h-4 w-4 place-items-center rounded bg-white/90 text-[7px] font-black text-[#0b1a24]">S</span>
                    <div className="flex items-center gap-1.5 text-[5.5px] font-semibold tracking-wide text-[#1d1d1f]/75">
                      <span>HOME</span><span>TEAMS</span><span>FIXTURES</span><span>NEWS</span><span>ABOUT</span><span>CONTACT</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-white/30" />
                      <span className="h-2 w-2 rounded-full bg-white/30" />
                    </div>
                  </div>
                  <div className="pb-1 pt-6 text-center">
                    <p className="text-[14px] font-semibold leading-tight tracking-wide text-[#1d1d1f] drop-shadow">SEAFORTH NETBALL CLUB</p>
                    <p className="mb-3 text-[9px] font-bold tracking-[0.28em] text-[#BD8A2C]">STRONGER TOGETHER</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="rounded bg-[#BD8A2C] px-2.5 py-1 text-[6px] font-bold text-black">JOIN OUR CLUB</span>
                      <span className="rounded border border-white/50 px-2.5 py-1 text-[6px] font-bold text-[#1d1d1f]">LATEST NEWS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniCard title="Dashboard">
                  <p className="text-[8px] text-[#86868b]">Registrations</p>
                  <p className="text-lg font-bold leading-none text-[#1d1d1f]">128</p>
                  <p className="mt-1 text-[7px] font-medium text-[#BD8A2C]">+12 this week</p>
                </MiniCard>
                <MiniCard title="Revenue">
                  <p className="text-[8px] text-[#86868b]">This month</p>
                  <p className="text-lg font-bold leading-none text-[#1d1d1f]">$4,250</p>
                  <p className="mt-1 text-[7px] font-medium text-[#BD8A2C]">+18% this month</p>
                  <svg viewBox="0 0 60 16" className="mt-1 h-4 w-full" aria-hidden>
                    <polyline fill="none" stroke="#BD8A2C" strokeWidth="1.5" points="0,13 12,10 24,12 36,6 48,8 60,2" />
                  </svg>
                </MiniCard>
              </div>
            </div>
          </div>

          {/* trust line */}
          <div className={`mt-12 flex items-center justify-center gap-3 border-t ${hairline} pt-8`}>
            <p className="text-sm font-semibold text-[#1d1d1f]">Secure. Reliable. Australian.</p>
            <AustraliaMap className="h-9 w-12 text-[#BD8A2C]" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Contact
   ────────────────────────────────────────────────────────── */
function Contact() {
  return (
    <section id="contact" className={`${pageBg} py-20`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#BD8A2C]">Contact</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
              Tell us about your club
            </h2>
            <p className="mt-5 max-w-md text-base text-[#6e6e73]">
              We&apos;ll come back within one business day with tailored pricing, a recommended rollout, and
              a demo time.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[#BD8A2C]" />
                <span className={muted}>Sydney, Australia</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-[#BD8A2C]" />
                <a href="mailto:rowan@sidelinepro.com.au" className={`${muted} transition-colors hover:text-[#1d1d1f]`}>
                  rowan@sidelinepro.com.au
                </a>
              </div>
            </div>
            <div className={`mt-8 rounded-lg border ${hairline} ${cardBg} p-4`}>
              <p className={`text-sm ${muted}`}>
                <span className="font-medium text-[#1d1d1f]">Sideline Pro Pty Ltd · ACN 697 721 627</span>
              </p>
            </div>
          </div>
          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────
   Footer
   ────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { head: "Product", links: ["Modern Websites", "Mobile Apps", "Fixtures & Ladders", "Umpire Management"] },
    { head: "Company", links: ["About", "Pricing", "Contact"] },
  ]
  return (
    <footer className={`border-t ${hairline} bg-[#f5f5f7] py-12`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo size="footer" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#86868b]">
              Designed and shipped from Sydney for Australian community clubs.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.head}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#86868b]">{col.head}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#contact" className="text-[#6e6e73] transition-colors hover:text-[#1d1d1f]">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`mt-10 border-t ${hairline} pt-8`}>
          <p className="text-sm text-[#86868b]">
            &copy; {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721 627. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ──────────────────────────────────────────────────────────
   Mobile apps — App Store-style screenshots
   ────────────────────────────────────────────────────────── */
function MobileApp() {
  const screens = [
    {
      src: "/app-club.png",
      alt: "Sideline Pro mobile app — club dashboard with season snapshot, top-of-grade teams and next game",
    },
    {
      src: "/app-lineup.png",
      alt: "Sideline Pro mobile app — coach lineup builder with court positions and bench",
    },
    {
      src: "/app-player.png",
      alt: "Sideline Pro mobile app — player profile with season stats and upcoming fixtures",
    },
  ]
  return (
    <section id="mobile-apps" className={`relative overflow-hidden ${pageBg} py-16 lg:py-24`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 55% at 50% 0%, rgba(224,168,46,0.05), transparent 60%)" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full border ${hairline} bg-[#f5f5f7] px-4 py-1.5`}>
            <Smartphone className="h-3.5 w-3.5 text-[#BD8A2C]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#BD8A2C]">
              Mobile apps
            </span>
          </div>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-[#1d1d1f] sm:text-5xl">
            Your club.{" "}
            <span
              style={{
                background: goldGrad,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              In your pocket.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73]">
            Native iOS &amp; Android apps for players, parents, coaches and officials — everything they
            need to stay on top of the season, the team and the game day.
          </p>
        </div>

        <div className="grid items-end gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
          {screens.map((s, i) => (
            <div key={s.src} className={`relative ${i === 1 ? "sm:-mt-8 lg:-mt-12" : ""}`}>
              <Image
                src={s.src}
                alt={s.alt}
                width={853}
                height={1844}
                className="mx-auto h-auto w-full max-w-[200px] sm:max-w-none"
                sizes="(max-width: 640px) 60vw, 33vw"
              />
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-sm text-[#6e6e73]">Native iOS &amp; Android apps — available on launch</p>
          <a href="#contact" className={`${goldBtn} px-7 py-3.5 text-sm`}>
            Book a Demo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Navbar />
      <main>
        <Hero />
        {/* Mobile/tablet: native responsive HTML feature row */}
        <div className="lg:hidden">
          <FeatureRow />
        </div>
        {/* Desktop: polished composite image */}
        <section id="features" className={`hidden ${pageBg} py-12 lg:block`}>
          <div className="mx-auto max-w-7xl px-6">
            <Image
              src="/bottom-section.png"
              alt="Sideline Pro all-in-one platform — club website, coach hub and player grading"
              width={2172}
              height={724}
              className="h-auto w-full"
            />
          </div>
        </section>
        <MobileApp />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
