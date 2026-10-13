"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

export type HeroSlide = {
  src: string
  alt: string
  /** CSS object-position for the crop focus, e.g. "center 30%" */
  focus?: string
}

const ROTATE_MS = 5_000

/**
 * Crossfading hero photo carousel, same behaviour as the club sites:
 * slides stay mounted once shown and crossfade on opacity, rotation pauses
 * while the tab is hidden, and reduced-motion users get a single still.
 */
export function HeroCarousel({ slides, className = "" }: { slides: HeroSlide[]; className?: string }) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [visible, setVisible] = useState(true)
  const [shown, setShown] = useState<number[]>([0])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduceMotion(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible")
    onVisibility()
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    if (reduceMotion || !visible || slides.length <= 1) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [reduceMotion, visible, slides.length])

  useEffect(() => {
    setShown((prev) => (prev.includes(index) ? prev : [...prev, index]))
  }, [index])

  const active = reduceMotion ? 0 : index

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {slides.map((s, i) => {
        if (!shown.includes(i)) return null
        const isActive = i === active
        return (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            fill
            priority={i === 0}
            quality={78}
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="pointer-events-none object-cover transition-opacity duration-700 ease-in-out"
            style={{ objectPosition: s.focus ?? "center 30%", opacity: isActive ? 1 : 0 }}
            aria-hidden={!isActive}
          />
        )
      })}
    </div>
  )
}
