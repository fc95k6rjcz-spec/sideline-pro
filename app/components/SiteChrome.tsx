import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import styles from "../home.module.css"
import { MobileNav } from "./MobileNav"

// Shared by the homepage and the feature pages. `base` is "" on the homepage
// (same-page anchors) and "/" elsewhere, so every link lands on a homepage section.
export const navLinks = (base = ""): [string, string][] => [
  ["The platform", `${base}#platform`],
  ["Features", `${base}#features`],
  ["Seaforth story", `${base}#seaforth`],
  ["Our approach", `${base}#approach`],
]

export function SiteHeader({ base = "" }: { base?: string }) {
  const links = navLinks(base)
  return <header className={styles.header}><div className={styles.nav}>
    <a href={base ? "/" : "#top"} aria-label="SidelinePro home"><Image src="/logo-horizontal-dark.svg" alt="SidelinePro" width={174} height={48} priority className={styles.logo}/></a>
    <nav aria-label="Main navigation" className={styles.desktopNav}>{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
    <a className={styles.button} href={`${base}#contact`}>Book a demo <ArrowUpRight size={16}/></a>
    <MobileNav className={styles.mobileNav} links={links}/>
  </div></header>
}

export function SiteFooter({ base = "" }: { base?: string }) {
  return <footer className={styles.footer}><div><Image src="/logo-horizontal-dark.svg" alt="SidelinePro" width={174} height={48}/><p>Powered by SidelinePro. Built around your sport.<br/>100% Australian owned and operated.</p></div><div>{navLinks(base).map(([label,href])=><a key={href} href={href}>{label}</a>)}<a href={`${base}#contact`}>Book a demo</a></div><small>© {new Date().getFullYear()} Sideline Pro Pty Ltd · ACN 697 721 627</small></footer>
}
