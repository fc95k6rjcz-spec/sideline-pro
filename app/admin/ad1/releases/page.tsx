import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReleaseForm from "./ReleaseForm";
export const metadata: Metadata = {title:"Testimonial consent · SidelinePro",robots:{index:false,follow:false}};
export const dynamic = "force-dynamic";
export default async function ReleasesPage() {
  const auth = await createClient(); const {data:{user}} = await auth.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) redirect("/login?redirect=%2Fadmin%2Fad1%2Freleases");
  // Only retrieve private details when a specific signed form is opened.
  const {data,error} = await createAdminClient().from("testimonial_releases").select("id,full_name,signed_at,withdrawn_at").order("signed_at",{ascending:false}).limit(100);
  return <main className="mx-auto max-w-3xl space-y-8 text-[#122b40]">
    <Link href="/admin/ad1" className="underline">← Back to interview checklist</Link>
    <ReleaseForm />
    <section className="rounded-2xl border p-6"><h2 className="text-xl font-bold">Saved releases · private admin records</h2>
    {error ? <p role="alert">Could not load saved releases. Please reload before filming.</p> : !data?.length ? <p>No signed releases yet.</p> : <ul className="divide-y">{data.map(r=><li key={r.id} className="py-4"><Link className="font-bold underline" href={`/admin/ad1/releases/${r.id}`}>{r.full_name}</Link><p>{r.withdrawn_at?"Withdrawn — do not use":"Consent recorded"} · {new Date(r.signed_at).toLocaleDateString("en-AU",{timeZone:"Australia/Sydney"})}</p></li>)}</ul>}
    </section>
  </main>;
}
