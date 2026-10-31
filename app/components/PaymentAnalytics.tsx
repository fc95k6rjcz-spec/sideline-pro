"use client"

import { useState } from "react"
import { BellRing, Check } from "lucide-react"
import styles from "../home.module.css"

// A treasurer's view of program payments. All figures are fictional
// (Baseline Basketball Academy, Term 4) — never real club or Stripe data.
const weeks = ["4 Oct","11 Oct","18 Oct","25 Oct","1 Nov","8 Nov","15 Nov","22 Nov","29 Nov","6 Dec","13 Dec","20 Dec"]
const current = [3.1,6.8,9.4,5.2,4.6,3.9,4.4,3.2,2.6,2.1,1.8,1.2]
const previous = [2.4,4.9,6.1,4.8,3.7,3.5,3.0,2.8,2.2,1.9,1.4,1.0]
const programs = [
  { name: "Term 4 training groups", collected: 21450, paid: 186, outstanding: 4 },
  { name: "Summer teams", collected: 14880, paid: 124, outstanding: 9 },
  { name: "Development programs", collected: 8240, paid: 72, outstanding: 2 },
  { name: "Holiday camps", collected: 3750, paid: 30, outstanding: 0 },
]
const views = ["Collected", "Payments"] as const
const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })

function Chart({ a, b }: { a: number[]; b: number[] }) {
  const W = 560, H = 170, max = Math.max(...a, ...b) * 1.15
  const pts = (s: number[]) => s.map((v, i) => `${(i / (s.length - 1)) * W},${H - (v / max) * H}`).join(" ")
  return <svg viewBox={`0 0 ${W} ${H + 22}`} className={styles.paChart} role="img" aria-label="Weekly payments this term compared with last term">
    {[0.25, 0.5, 0.75, 1].map(g => <line key={g} x1="0" x2={W} y1={H - g * H} y2={H - g * H} stroke="#dde3ea" />)}
    <polyline points={pts(b)} fill="none" stroke="#93a0b4" strokeWidth="2" strokeDasharray="4 4" />
    <polygon points={`0,${H} ${pts(a)} ${W},${H}`} fill="#00bfae1f" />
    <polyline points={pts(a)} fill="none" stroke="#00bfae" strokeWidth="3" strokeLinejoin="round" />
    <text x="0" y={H + 18} fontSize="11" fill="#6b7588">{weeks[0]}</text>
    <text x={W} y={H + 18} fontSize="11" fill="#6b7588" textAnchor="end">{weeks[weeks.length - 1]}</text>
  </svg>
}

export function PaymentAnalytics() {
  const [view, setView] = useState<(typeof views)[number]>("Collected")
  const [reminded, setReminded] = useState(false)
  const total = programs.reduce((s, p) => s + p.collected, 0)
  const paid = programs.reduce((s, p) => s + p.paid, 0)
  const outstanding = programs.reduce((s, p) => s + p.outstanding, 0)
  const scale = view === "Collected" ? 1 : paid / (total / 1000)
  return <figure className={styles.paFigure}>
    <div className={styles.paPanel}>
      <div className={styles.paTop}>
        <div><span className={styles.paKicker}>BASELINE BASKETBALL ACADEMY · TREASURER</span><strong>Payment analytics</strong></div>
        <div className={styles.paFilters}><span>Term 4</span><span>Weekly</span><span>vs last term</span></div>
      </div>
      <div className={styles.paMetrics}>
        <div><span>Registrations tracked</span><strong>{paid + outstanding}</strong><em>Across {programs.length} programs</em></div>
        <div><span>Collected</span><strong>{money(total)}</strong><em>+18.6%</em></div>
        <div><span>Players paid</span><strong>{paid}</strong><em>+64</em></div>
        <div className={styles.paAlert}><span>Yet to pay</span><strong>{outstanding} players</strong><button type="button" onClick={() => setReminded(true)} disabled={reminded}>{reminded ? <><Check size={13} /> Reminders queued</> : <><BellRing size={13} /> Send reminders</>}</button></div>
      </div>
      <div className={styles.paBody}>
        <div className={styles.paChartWrap}>
          <div className={styles.paTabs} role="tablist" aria-label="Chart measure">{views.map(v => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}>{v}</button>)}</div>
          <Chart a={current.map(v => v * scale)} b={previous.map(v => v * scale)} />
          <p className={styles.paLegend}><span className={styles.paCur} /> This term <span className={styles.paPrev} /> Last term</p>
        </div>
        <table className={styles.paTable}>
          <thead><tr><th>Program</th><th>Collected</th><th>Paid</th><th>Owing</th></tr></thead>
          <tbody>{programs.map(p => <tr key={p.name}><td>{p.name}</td><td>{money(p.collected)}</td><td>{p.paid}</td><td className={p.outstanding ? styles.paOwing : undefined}>{p.outstanding || "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
    <figcaption>See who has paid for what, program by program, and chase only the players who haven’t.<small>Illustrative render · fictional club and figures · reminders are not sent</small></figcaption>
  </figure>
}
