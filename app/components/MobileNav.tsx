"use client"

import { useRef } from "react"

export function MobileNav({ className }: { className: string }) {
  const menu = useRef<HTMLDetailsElement>(null)
  function close() { if (menu.current) menu.current.open = false }
  return <details ref={menu} className={className} onKeyDown={event => { if (event.key === "Escape") { close(); menu.current?.querySelector("summary")?.focus() } }}>
    <summary aria-label="Toggle navigation">Menu</summary>
    <nav aria-label="Mobile navigation">
      <a href="#platform" onClick={close}>The platform</a>
      <a href="#people" onClick={close}>Who it’s for</a>
      <a href="#seaforth" onClick={close}>Seaforth story</a>
    </nav>
  </details>
}
