import type { ReactNode } from "react"
import Image from "next/image"
import { ContactForm } from "@/components/contact-form"
import {
  Users,
  ClipboardList,
  Calendar,
  UserCircle,
  ShoppingBag,
  Shield,
  Check,
  Mail,
  MapPin,
} from "lucide-react"

// Dark (nav, hero, footer) — logo needs a dark background
const darkBg = "bg-[#0F2744]"
const darkCard = "bg-[#162E52]"
const darkInset = "bg-[#1A3864]"
const darkBorder = "border-white/[0.10]"
const darkTextMuted = "text-blue-100/60"

// Light (body)
const lightBorder = "border-slate-200"
const textLight = "text-slate-900"
const textMuted = "text-slate-500"

const primaryCta =
  "inline-flex items-center justify-center rounded-lg bg-amber-500 font-semibold text-white transition-colors hover:bg-amber-400"

function SectionEyebrow({
  children,
  align = "center",
  dark = false,
}: {
  children: ReactNode
  align?: "center" | "start"
  dark?: boolean
}) {
  return (
    <div className={`mb-6 flex flex-col gap-3 ${align === "center" ? "items-center" : "items-start"}`}>
      <span className={`text-xs font-medium uppercase tracking-[0.2em] ${dark ? "text-amber-400" : "text-amber-500"}`}>
        {children}
      </span>
      <span className={`h-px w-12 ${dark ? "bg-amber-400/40" : "bg-amber-500/40"}`} aria-hidden />
    </div>
  )
}

function Logo({ className = "", size = "nav" }: { className?: string; size?: "nav" | "footer" }) {
  const imgClass = size === "footer" ? "h-12 sm:h-14 w-auto" : "h-10 sm:h-12 w-auto"
  return (
    <a href="/" className={`inline-block shrink-0 ${className}`}>
      <Image
        src="/sideline-pro-logo.png"
        alt="Sideline Pro — Complete club management"
        width={1010}
        height={260}
        className={imgClass}
        priority={size === "nav"}
      />
    </a>
  )
}

function Navbar() {
  return (
    <nav className={`fixed top-0 z-50 w-full border-b ${darkBorder} ${darkBg}/95 backdrop-blur-md`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          <a href="#who-uses-it" className={`text-sm ${darkTextMuted} transition-colors hover:text-white`}>
            Who uses it
          </a>
          <a href="#how-it-works" className={`text-sm ${darkTextMuted} transition-colors hover:text-white`}>
            How it works
          </a>
          <a href="#child-safety" className={`text-sm ${darkTextMuted} transition-colors hover:text-white`}>
            Child safety
          </a>
        </div>
        <a href="#contact" className={`${primaryCta} px-5 py-2 text-sm`}>
          Get a demo
        </a>
      </div>
    </nav>
  )
}

function HeroStats() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Club dashboard</span>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Live
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Active members</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">350 players</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Teams managed</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">50 teams</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Umpires on platform</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">92 umpires</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Parents & guardians</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">1,200+</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Season status</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-emerald-600">Full season ✓</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Umpire confirmations</p>
            <p className="text-sm font-semibold tabular-nums text-slate-900">94%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[94%] rounded-full bg-amber-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className={`relative overflow-hidden pt-32 pb-20 ${darkBg}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#1e4080_0%,_transparent_60%)]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full border ${darkBorder} bg-white/[0.06] px-4 py-2`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white/80">
                Live — Full Winter 2026 season at Seaforth Netball Club
              </span>
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Complete club management for community netball.
            </h1>
            <p className="mb-5 text-xl font-semibold text-amber-400 sm:text-2xl">
              Grade the whole player. Not just the moment.
            </p>
            <div className="mb-6 h-px w-14 rounded-full bg-amber-500/60" aria-hidden />
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-blue-100/70">
              Sideline Pro brings coaches, managers, umpires, parents, players and committees into one
              portal — with proper governance, child safety oversight, and the Saturday-morning operational
              tools community clubs actually need.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className={`${primaryCta} px-6 py-3`}>
                Get a demo
              </a>
              <a
                href="#who-uses-it"
                className={`inline-flex items-center rounded-lg border ${darkBorder} px-6 py-3 font-semibold text-white transition-colors hover:bg-white/[0.06]`}
              >
                See how it works
              </a>
            </div>
          </div>
          <div className="lg:justify-self-end">
            <HeroStats />
          </div>
        </div>
      </div>
    </section>
  )
}

function ProofStrip() {
  const items = [
    { label: "350 players · 50 teams · 92 umpires · 1,200+ parents" },
    { label: "6 portals. One platform. Zero spreadsheets." },
    { label: "Full Winter 2026 season — live from Round 1" },
  ]
  return (
    <section className="bg-amber-500 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-6">
          {items.map((item) => (
            <p key={item.label} className="text-sm font-semibold leading-snug text-white sm:text-[15px]">
              {item.label}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustedBy() {
  return (
    <section className="border-b border-slate-200 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-12">
          <div className="max-w-2xl text-center lg:min-w-0 lg:flex-1 lg:text-left">
            <p className="text-sm leading-relaxed text-slate-500 sm:text-base">
              Built inside{" "}
              <span className="font-semibold text-slate-900">Seaforth Netball Club</span>
              {" "}(Manly Warringah Netball Association) — running their full 2026 season on Sideline Pro.{" "}
              <span className="font-semibold text-slate-900">Reference calls available on request.</span>
            </p>
          </div>
          <figure className="w-full max-w-md shrink-0 lg:max-w-[380px] lg:self-center">
            <div
              className={`relative aspect-[16/10] overflow-hidden rounded-xl border ${lightBorder} bg-slate-100 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/[0.04]`}
            >
              <Image
                src="/seaforth-netball-site-thumb.png"
                alt="Seaforth Netball Club website — homepage with 2026 season hero, navigation, and Round 1 snapshot"
                fill
                className="object-cover object-left object-top"
                sizes="(max-width: 1024px) 100vw, 380px"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-slate-400 lg:text-left">
              Club website powered by Sideline Pro
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

const portals = [
  {
    icon: Users,
    title: "Coach Hub",
    role: "Coaches",
    color: "text-blue-600 bg-blue-50 border-blue-100",
    features: [
      "Drag-and-drop lineup builder (7 positions × 4 quarters)",
      "Game review with competency tagging and training priorities",
      "Score capture with season stats — W/L, margins, trends",
      "Direct squad messaging with read receipts",
    ],
  },
  {
    icon: ClipboardList,
    title: "Manager Hub",
    role: "Managers",
    color: "text-orange-600 bg-orange-50 border-orange-100",
    features: [
      "Player roster with contact details and registration status",
      "Guardian visibility — spot unusual access requests fast",
      "Forfeit form with one-click association notification",
      "Required documents checklist and gear bag hand-back",
    ],
  },
  {
    icon: Calendar,
    title: "Umpire Hub",
    role: "Umpires",
    color: "text-purple-600 bg-purple-50 border-purple-100",
    features: [
      "One-click confirm or decline per allocation",
      "Round attendance tracking with reliability scores",
      "Accreditation record and mentor pairing for juniors",
      "Swap requests — propose and both parties confirm",
    ],
  },
  {
    icon: UserCircle,
    title: "Parent Hub",
    role: "Parents & Guardians",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    features: [
      "Linked children with fixtures, team, and coach info",
      "Game day weather forecast and court map",
      "Child Safe Sport: see who can view your child's profile",
      "\"I don't recognise this person\" flag with tiered escalation",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Grader Hub",
    role: "Graders",
    color: "text-sky-600 bg-sky-50 border-sky-100",
    features: [
      "Structured grading session management",
      "Player evaluation forms with weighted scoring",
      "Team selection and squad allocation tooling",
      "Carry-over and promotion tracking",
    ],
  },
  {
    icon: Shield,
    title: "Admin Hub",
    role: "Committee & Executives",
    color: "text-rose-600 bg-rose-50 border-rose-100",
    features: [
      "Saturday ops dashboard with traffic-light status per fixture",
      "Member approval queue with role-intent surfacing",
      "Membership CSV import with reconciliation report",
      "Umpire allocation grid — whole round on one screen",
    ],
  },
]

function WhoUsesIt() {
  return (
    <section id="who-uses-it" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <SectionEyebrow>Six portals</SectionEyebrow>
          <h2 className={`mb-4 text-3xl font-bold tracking-tight ${textLight} sm:text-4xl`}>
            Every role. One platform.
          </h2>
          <p className={`mx-auto max-w-2xl ${textMuted}`}>
            Six distinct portals — each built for how that role actually works on a Saturday morning and
            through the week.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portals.map((portal) => (
            <div
              key={portal.title}
              className={`rounded-xl border ${lightBorder} bg-white p-6 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border ${portal.color}`}>
                <portal.icon className="h-6 w-6" />
              </div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{portal.role}</p>
              <h3 className={`mb-4 text-lg font-semibold ${textLight}`}>{portal.title}</h3>
              <ul className="flex flex-col gap-2.5">
                {portal.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                    <span className={`text-sm leading-snug ${textMuted}`}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ScoreDots({ score, max = 5, mismatch = false }: { score: number; max?: number; mismatch?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < score
              ? mismatch
                ? "bg-amber-500"
                : "bg-slate-700"
              : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  )
}

function GradingCard() {
  const coachSkills = [
    { label: "Ball catching", coachScore: 3, graderScore: 5, mismatch: true },
    { label: "Footwork", coachScore: 4, graderScore: null, mismatch: false },
    { label: "Centre pass setup", coachScore: 2, graderScore: null, mismatch: false },
    { label: "Defensive pressure", coachScore: 4, graderScore: null, mismatch: false },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grading session · U14 A</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">Leg #213 — Sarah Mitchell</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Matched
          </span>
        </div>
      </div>

      {/* Coaching history */}
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Season coaching average · 14 reviews
        </p>
        <div className="flex flex-col gap-3">
          {coachSkills.map((skill) => (
            <div key={skill.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{skill.label}</span>
                <span className="text-xs font-semibold text-slate-500">{skill.coachScore}/5</span>
              </div>
              <ScoreDots score={skill.coachScore} />
            </div>
          ))}
        </div>
      </div>

      {/* Grader entry */}
      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your rating</p>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Ball catching</span>
              <span className="text-xs font-semibold text-amber-600">5/5</span>
            </div>
            <ScoreDots score={5} mismatch />
          </div>
        </div>
      </div>

      {/* Mismatch warning */}
      <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-800">⚠ Mismatch flagged</p>
        <p className="mt-0.5 text-xs text-amber-700">
          You rated <strong>5/5</strong>. Coaches averaged <strong>3/5</strong> across 14 sessions this season. Review before submitting.
        </p>
      </div>
    </div>
  )
}

function GradingIntelligence() {
  return (
    <section id="grading" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow align="start">Grading intelligence</SectionEyebrow>
            <h2 className={`-mt-2 mb-4 text-2xl font-bold tracking-tight ${textLight} sm:text-3xl`}>
              Grade the whole player.<br />Not just the moment.
            </h2>
            <p className={`mb-8 text-lg leading-relaxed ${textMuted}`}>
              Grading has always been a 45-minute snapshot. A player has a great catch on grading day —
              but her coach has been rating her catching a 3 all season. Previously, no one in the grading
              room knew that.
            </p>
            <div className="flex flex-col gap-6">
              {[
                {
                  title: "Enter a leg number, get the full story",
                  body: "Type #213 into the grading app. It matches the player and pulls her entire season's coaching reports live into the grading form — before you write a single score.",
                },
                {
                  title: "Mismatch flagging in real time",
                  body: "If your grading score diverges significantly from the coach average, the system flags it immediately. You can still override — but you do it with full context, not a gut feel.",
                },
                {
                  title: "Defensible play-up and play-down decisions",
                  body: "When a parent asks why their daughter was moved down a grade, you have 14 weeks of coaching data to point to — not a memory of one Saturday morning.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Check className="h-3 w-3 text-amber-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={`font-semibold ${textLight}`}>{item.title}</p>
                    <p className={`mt-1 text-sm leading-relaxed ${textMuted}`}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:justify-self-end lg:w-full lg:max-w-sm">
            <GradingCard />
          </div>
        </div>
      </div>
    </section>
  )
}

const safetyFeatures = [
  {
    title: "Profile access oversight",
    body: "Every read of a child's profile is logged. Parents and players see exactly who can view their data — coaches, managers, graders, admins.",
  },
  {
    title: "Multi-source flagging",
    body: "\"I don't recognise this person\" flow available to parents, managers and players. Any unusual linkage can be flagged directly from the portal.",
  },
  {
    title: "Tiered escalation with auto-quarantine",
    body: "One flag = soft alert to admin. Two independent flags from different sources = automatic quarantine pending review. No manual escalation required.",
  },
  {
    title: "Player self-visibility at 12+",
    body: "Players aged 12 and over can see who has access to their profile and raise concerns directly — right-to-be-informed compliance built in.",
  },
  {
    title: "Full audit trail",
    body: "Every administrative action, every profile access, every role change is logged with who, when, and why. Soft-delete with required reason on sensitive operations.",
  },
  {
    title: "Role-intent surfacing",
    body: "When a new member signs up requesting a coach or manager role, admins see that intent in plain English before approving. No more guessing.",
  },
]

function ChildSafety() {
  return (
    <section id="child-safety" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow align="start">Child Safe Sport</SectionEyebrow>
            <h2 className={`-mt-2 mb-4 text-2xl font-bold tracking-tight ${textLight} sm:text-3xl`}>
              The question every committee should be able to answer.
            </h2>
            <p className={`mb-8 text-lg leading-relaxed ${textMuted}`}>
              &ldquo;Who can see my child&apos;s profile?&rdquo; — Most clubs have no answer. Sideline Pro
              answers it cleanly, and it&apos;s increasingly required at association and state level.
            </p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Framework alignment
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Australian Child Safe Sport Standards",
                  "Netball Australia child safety policy",
                  "Australian Privacy Principles (APPs)",
                  "Right-to-be-informed for players aged 12+",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                    <span className="text-sm font-medium text-emerald-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {safetyFeatures.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl border ${lightBorder} bg-white p-5 shadow-sm`}
              >
                <p className={`mb-2 font-semibold ${textLight}`}>{f.title}</p>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const steps = [
  {
    number: "01",
    title: "We set up your club's instance",
    body: "Branded portal, your logo, your colours. Configured for your club's structure and playing levels.",
  },
  {
    number: "02",
    title: "Import members and history",
    body: "CSV import for fixtures, players and parents. Existing data carries over — no re-entry.",
  },
  {
    number: "03",
    title: "Train committee and coaches",
    body: "One session with your admin team, one with coaches and managers. Most are up and running in an afternoon.",
  },
  {
    number: "04",
    title: "Your season runs on Sideline Pro",
    body: "From grading weekend to grand final. We're here throughout your first season.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <SectionEyebrow>Onboarding</SectionEyebrow>
          <h2 className={`text-3xl font-bold tracking-tight ${textLight} sm:text-4xl`}>
            From signed contract to first round in two weeks.
          </h2>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step) => (
            <div key={step.number}>
              <span className="mb-3 block text-3xl font-bold tabular-nums text-amber-500 sm:text-4xl">
                {step.number}
              </span>
              <p className={`mb-2 text-[15px] font-semibold leading-snug ${textLight}`}>{step.title}</p>
              <p className={`text-sm leading-relaxed ${textMuted}`}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhySidelinePro() {
  const reasons = [
    {
      title: "Battle-tested across a full season",
      body: "Not a pitch deck — Seaforth Netball Club ran their entire 2026 season on Sideline Pro. Every workflow tested by real coaches, real managers, real parents on real Saturdays.",
    },
    {
      title: "Built for community sport budgets",
      body: "A 600-active-user club pays ~$600/year after setup. Most clubs recoup that in the first month by replacing tools they were already paying for separately.",
    },
    {
      title: "Female athlete safety built in",
      body: "ACL and knee injuries hit netball hard. Sideline Pro ships with a proven prevention program, structured warmups and incident logging — as part of the core, not an add-on.",
    },
    {
      title: "Your data, your domain, your brand",
      body: "Each club gets their own branded instance. Export anything, anytime. No lock-in, no shared databases, no surprises.",
    },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow align="start">Why Sideline Pro</SectionEyebrow>
            <h2 className={`-mt-2 mb-8 text-2xl font-bold tracking-tight ${textLight} sm:text-3xl`}>
              Built by a volunteer. Proven on a real club.
            </h2>
            <div className="flex flex-col gap-8">
              {reasons.map((reason) => (
                <div key={reason.title} className="flex gap-3">
                  <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Check className="h-3 w-3 text-amber-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={`font-semibold ${textLight}`}>{reason.title}</p>
                    <p className={`mt-1 text-sm leading-relaxed ${textMuted}`}>{reason.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border ${lightBorder} bg-slate-50 p-8 lg:p-12`}>
            <blockquote className={`text-lg leading-relaxed ${textLight}`}>
              &ldquo;We were using spreadsheets, WhatsApp groups, and paper forms. Now everything lives in
              one place. Our volunteers actually thank us.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div>
                <p className={`font-semibold ${textLight}`}>Seaforth Netball Club</p>
                <p className={`text-sm ${textMuted}`}>
                  Manly Warringah Netball Association — 350 players, 50 teams
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


function Contact() {
  return (
    <section id="contact" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionEyebrow align="start">Contact</SectionEyebrow>
            <h2 className={`-mt-2 mb-6 text-3xl font-bold tracking-tight ${textLight} sm:text-4xl`}>
              Tell us about your club
            </h2>
            <p className={`mb-8 text-lg ${textMuted}`}>
              We&apos;ll come back within one business day with tailored pricing, a recommended module
              rollout, and a demo time.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
                <span className={textMuted}>Sydney, Australia</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-slate-400" />
                <a
                  href="mailto:rowan@sidelinepro.com.au"
                  className={`${textMuted} transition-colors hover:text-slate-900`}
                >
                  rowan@sidelinepro.com.au
                </a>
              </div>
            </div>
            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className={`text-sm ${textMuted}`}>
                <span className={`font-medium ${textLight}`}>Sideline Pro Pty Ltd · ACN 697 721 627</span>
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

function Footer() {
  return (
    <footer className={`${darkBg} py-12`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <Logo size="footer" />
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-100/40">Product</p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="#who-uses-it" className={`${darkTextMuted} transition-colors hover:text-white`}>
                  Who uses it
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={`${darkTextMuted} transition-colors hover:text-white`}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#child-safety" className={`${darkTextMuted} transition-colors hover:text-white`}>
                  Child safety
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-100/40">Company</p>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a href="#contact" className={`${darkTextMuted} transition-colors hover:text-white`}>
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="mailto:rowan@sidelinepro.com.au"
                  className={`${darkTextMuted} transition-colors hover:text-white`}
                >
                  rowan@sidelinepro.com.au
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-100/40">Made in Sydney</p>
            <p className={`text-sm leading-relaxed ${darkTextMuted}`}>
              Designed and shipped from Sydney for Australian community clubs.
            </p>
            <p className={`mt-2 text-xs ${darkTextMuted}`}>Sideline Pro Pty Ltd · ACN 697 721 627</p>
          </div>
        </div>
        <div className={`mt-10 flex flex-col gap-2 border-t ${darkBorder} pt-8 sm:flex-row sm:items-center sm:justify-between`}>
          <p className={`text-sm ${darkTextMuted}`}>
            &copy; {new Date().getFullYear()} Sideline Pro Pty Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <ProofStrip />
        <TrustedBy />
        <WhoUsesIt />
        <GradingIntelligence />
        <ChildSafety />
        <HowItWorks />
        <WhySidelinePro />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
