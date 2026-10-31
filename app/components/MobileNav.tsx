"use client"

import { useRef } from "react"

export function MobileNav({ className, links }: { className: string; links: [string, string][] }) {
  const menu = useRef<HTMLDetailsElement>(null)
  function close() { if (menu.current) menu.current.open = false }
  return <details ref={menu} className={className} onKeyDown={event => { if (event.key === "Escape") { close(); menu.current?.querySelector("summary")?.focus() } }}>
    <summary aria-label="Toggle navigation">Menu</summary>
    <nav aria-label="Mobile navigation">
      {links.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
    </nav>
  </details>
}
