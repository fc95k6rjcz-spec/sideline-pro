import Image from "next/image"
import { HoldingForm } from "@/components/holding-form"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#111_0%,_transparent_60%)]" aria-hidden />

      <div className="relative flex w-full max-w-xl flex-col items-center text-center">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/sideline-pro-logo.png"
            alt="Sideline Pro — Complete club management"
            width={1010}
            height={260}
            className="h-14 w-auto sm:h-16"
            priority
          />
        </div>

        {/* Lead */}
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Sideline Pro takes the administrative load off netball club volunteers.
        </h1>

        {/* Features */}
        <ul className="mb-8 w-full space-y-3 text-left text-base leading-relaxed text-blue-100/70">
          <li className="flex gap-3">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-100/40" aria-hidden />
            <span>
              <span className="font-semibold text-white">Umpire allocation</span>{" "}
              — automated rostering that replaces hours of spreadsheet juggling.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-100/40" aria-hidden />
            <span>
              <span className="font-semibold text-white">Player grading</span>{" "}
              — managed through an easy-to-use app, no more chasing forms.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-100/40" aria-hidden />
            <span>
              <span className="font-semibold text-white">Club communications</span>{" "}
              — one centralised place for messages, instead of five different group chats.
            </span>
          </li>
        </ul>

        <p className="mb-8 text-sm uppercase tracking-[0.25em] text-blue-100/50">
          Coming soon
        </p>

        {/* Email capture */}
        <HoldingForm />

        {/* Live reference */}
        <p className="mt-10 text-sm text-blue-100/60">
          See it in action at{" "}
          <a
            href="https://seaforthnetball.com.au"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-white underline decoration-blue-100/30 underline-offset-4 hover:decoration-white"
          >
            Seaforth Netball Club
          </a>
          .
        </p>

        {/* Footer */}
        <p className="mt-6 text-xs text-blue-100/30">
          Sideline Pro Pty Ltd · ACN 697 721 627 · Sydney, Australia
        </p>
      </div>
    </div>
  )
}
