import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/auth";
import { z } from "zod";
import RecordControls from "./RecordControls";
export const dynamic="force-dynamic";
export default async function SignedRelease({params}:{params:Promise<{id:string}>}) {
  const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
  if(!user || !isAllowedEmail(user.email)) redirect("/login?redirect=%2Fadmin%2Fad1%2Freleases");
  const {id}=await params;if(!z.string().uuid().safeParse(id).success) notFound();
  const {data:r,error}=await createAdminClient().from("testimonial_releases").select("id,full_name,date_of_birth,role,signature,release_version,release_text,signed_at,withdrawn_at").eq("id",id).maybeSingle();
  if(error) return <p role="alert">The release could not be loaded. Please reload. Do not assume consent until the record is visible.</p>;
  if(!r) notFound();
  return <main className="mx-auto max-w-3xl space-y-6 text-[#122b40]">
    <Link className="underline print:hidden" href="/admin/ad1/releases">← Back to releases</Link>
    <article className="rounded-2xl border bg-white p-6 sm:p-8">
      <h1 className="text-3xl font-bold">SidelinePro testimonial release</h1>
      <p className={`my-5 rounded-xl p-4 font-bold ${r.withdrawn_at?"bg-red-50 text-red-900":"bg-emerald-50"}`}>{r.withdrawn_at?`WITHDRAWN — do not use. Recorded ${new Date(r.withdrawn_at).toLocaleString("en-AU",{timeZone:"Australia/Sydney"})} (Sydney time).`:"Consent recorded — participant may withdraw at any time"}</p>
      <dl className="space-y-2"><div><dt className="inline font-bold">Name: </dt><dd className="inline">{r.full_name}</dd></div><div><dt className="inline font-bold">Date of birth: </dt><dd className="inline">{r.date_of_birth}</dd></div><div><dt className="inline font-bold">Role: </dt><dd className="inline">{r.role || "Not supplied"}</dd></div><div><dt className="inline font-bold">Typed electronic signature: </dt><dd className="inline">{r.signature}</dd></div><div><dt className="inline font-bold">Signed: </dt><dd className="inline">{new Date(r.signed_at).toLocaleString("en-AU",{timeZone:"Australia/Sydney"})} (Sydney time)</dd></div></dl>
      <p className="my-4 text-sm">Release version {r.release_version} · Record {r.id}</p>
      <h2 className="mb-4 text-xl font-bold">Terms agreed at signing</h2><p className="whitespace-pre-wrap leading-7">{r.release_text}</p>
    </article>
    <RecordControls id={r.id} withdrawn={!!r.withdrawn_at}/>
  </main>;
}
