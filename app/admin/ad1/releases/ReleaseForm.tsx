"use client";
import { useState } from "react";
import Link from "next/link";
import { releaseParagraphs, RELEASE_VERSION } from "@/lib/testimonials/release";
import { saveRelease } from "./actions";
export default function ReleaseForm() {
  const [pending,setPending]=useState(false), [error,setError]=useState(""), [saved,setSaved]=useState("");
  const [requestId,setRequestId]=useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(pending) return;
    const form=event.currentTarget; const values=new FormData(form);
    const id=requestId || crypto.randomUUID(); setRequestId(id);setPending(true);setError("");
    try {
      const result=await saveRelease({id,fullName:values.get("fullName"),dob:values.get("dob"),role:values.get("role"),signature:values.get("signature"),consent:values.get("consent")==="on",version:RELEASE_VERSION});
      if(result.error) setError(result.error); else if(result.id) {setSaved(result.id);form.reset();}
    } catch {setError("Could not confirm saving. Check saved releases before trying again. Your consent is not confirmed here.");}
    finally {setPending(false);}
  }
  if(saved) return <section className="rounded-2xl bg-[#e1f5ed] p-8" role="status"><h1 className="text-2xl font-bold">Your consent has been saved</h1><p className="my-4">Thank you. You can still change your mind at any time — tell Justin or email rowan@sidelinepro.com.au.</p><Link className="font-bold underline" href={`/admin/ad1/releases/${saved}`}>Open your signed copy · print or save as PDF</Link><button className="mt-6 block rounded-xl border bg-white p-3" onClick={()=>{setSaved("");setRequestId("");}}>Prepare a new form for the next participant</button></section>;
  return <section className="rounded-2xl border bg-white p-6 sm:p-8">
    <p className="text-sm font-bold uppercase tracking-wider text-teal-700">SidelinePro · adult testimonial release</p>
    <h1 className="my-4 text-3xl font-bold">Your story. Your choice.</h1>
    <p className="mb-6 rounded-xl bg-[#e1f5ed] p-4">Please read this yourself before signing. You can say no, stop filming, or ask us to remove your advertisement at any time.</p>
    <div className="space-y-5">{releaseParagraphs.map(([title,text])=><section key={title}><h2 className="font-bold">{title}</h2><p className="mt-1 leading-7">{text}</p></section>)}</div>
    <form onSubmit={submit} className="mt-8 space-y-5" autoComplete="off">
      <fieldset disabled={pending} className="space-y-5">
        <label className="block font-bold">Full name<input required name="fullName" maxLength={150} className="mt-2 block w-full rounded-lg border p-3 font-normal"/></label>
        <label className="block font-bold">Date of birth · kept private<input required type="date" name="dob" className="mt-2 block w-full rounded-lg border p-3 font-normal"/></label>
        <label className="block font-bold">Role for the testimonial (optional)<input name="role" maxLength={150} placeholder="For example, Umpire Convenor" className="mt-2 block w-full rounded-lg border p-3 font-normal"/></label>
        <label className="block font-bold">Your electronic signature<input required name="signature" maxLength={150} placeholder="Type your full name to sign" className="mt-2 block w-full rounded-lg border p-3 font-normal"/><span className="mt-2 block text-sm font-normal">Type your own full name, matching the name above. The interviewer must not sign for you.</span></label>
        <label className="flex gap-3 leading-7"><input required type="checkbox" name="consent" className="mt-1 h-6 w-6 shrink-0 accent-teal-700"/>I am 18 or older. I have read this release, understand that I can withdraw, and freely agree to the uses described and to sign electronically.</label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
        <button type="submit" className="rounded-xl bg-[#102c40] px-6 py-4 font-bold text-white">{pending?"Saving consent…":"Sign and save my consent"}</button>
      </fieldset>
    </form>
    <p className="mt-5 text-sm text-slate-600">Adult participants only. A child needs a separate guardian consent process. Version {RELEASE_VERSION}. No details are saved in this browser’s local storage.</p>
  </section>;
}
