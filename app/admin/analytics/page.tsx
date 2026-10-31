import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAllowedEmail } from '@/lib/auth'
import { readVisits } from '@/lib/site-analytics'

export const dynamic = 'force-dynamic'
export default async function AnalyticsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !isAllowedEmail(user.email)) redirect('/login')
  let result: Awaited<ReturnType<typeof readVisits>>
  try { result = await readVisits() } catch {
    return <div><h1 className="text-3xl font-bold">Site analytics</h1><p className="mt-6 rounded-xl bg-amber-50 p-5">Analytics storage is unavailable. No figures have been substituted. Check the Supabase storage connection and service-role configuration.</p><a className="mt-4 inline-block underline" href="/admin/analytics">Try again</a></div>
  }
  const { visits, capped } = result
  const count = (field: 'path' | 'source' | 'country') => Object.entries(visits.reduce<Record<string, number>>((acc, v) => { const key = v[field] || 'Unknown'; acc[key] = (acc[key] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10)
  return <div className="text-[#0A1220]"><p className="text-xs font-bold uppercase tracking-widest text-[#00796E]">SidelinePro · private admin</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><h1 className="text-4xl font-bold">Site analytics</h1><a href="/admin/analytics" className="rounded-lg bg-[#00BFAE] px-5 py-3 font-bold">Refresh data</a></div><p className="mt-4 text-sm text-slate-600">Consenting visits to the marketing website in the last 30 days. {capped ? 'Showing the latest 500 recorded page views; totals below describe this sample.' : 'Collection starts from launch; historical visits are not imported.'} Repeated views from the same IP and page within 30 seconds count once. The separately hosted interactive demos are not included.</p>
    <div className="my-8 grid gap-4 sm:grid-cols-3">{[['Recorded page views', visits.length], ['Visitor cookies', new Set(visits.map(v => v.visitor)).size], ['Referral sources', new Set(visits.map(v => v.source)).size]].map(([title, value]) => <div key={title} className="rounded-2xl bg-[#EAF7F3] p-6"><p className="text-sm">{title}</p><strong className="mt-3 block text-4xl">{value}</strong></div>)}</div>
    {!visits.length && <p className="mb-6 rounded-xl border p-5">No consenting page views recorded yet. Declined visits are not included.</p>}
    <div className="grid gap-5 md:grid-cols-3">{(['path', 'source', 'country'] as const).map((field, i) => <section key={field} className="rounded-2xl border p-5"><h2 className="mb-4 text-lg font-bold">{['Popular pages', 'Where visits came from', 'Countries'][i]}</h2><ul>{count(field).map(([name, n]) => <li key={name} className="flex justify-between gap-3 border-t py-3 text-sm"><span className="break-all">{name}</span><strong>{n}</strong></li>)}</ul></section>)}</div>
    <h2 className="mb-3 mt-9 text-2xl font-bold">Recent visits</h2><p className="mb-4 text-sm text-slate-600">An IP or cookie identifies a connection or browser, not a person. Location is approximate and may reflect a VPN or mobile network. Times shown in Sydney time.</p>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-[#EAF7F3]"><tr>{['Time', 'Page', 'Source', 'Location', 'Device', 'Visitor / IP'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{visits.slice(0, 100).map((v, i) => <tr key={v.at + i} className="border-t"><td className="p-3">{new Date(v.at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'short', timeStyle: 'short' })}</td><td className="p-3">{v.path}</td><td className="p-3 break-all">{v.source}</td><td className="p-3">{[v.city, v.country].filter(Boolean).join(', ') || 'Unknown'}</td><td className="p-3">{v.device}</td><td className="p-3"><details><summary className="cursor-pointer">{v.visitor.slice(0, 8)}…</summary><p className="mt-2 break-all">IP: {v.ip}</p></details></td></tr>)}</tbody></table></div>
  </div>
}
