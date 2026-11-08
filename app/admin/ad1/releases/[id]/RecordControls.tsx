"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {withdrawRelease} from "../actions";
export default function RecordControls({id,withdrawn}:{id:string;withdrawn:boolean}) {
  const [pending,setPending]=useState(false),[error,setError]=useState("");const router=useRouter();
  async function withdraw(){
    if(!window.confirm("Has the participant asked to withdraw? Record that request now. You must also stop ads and remove controlled copies manually."))return;
    setPending(true);setError("");
    try{const result=await withdrawRelease(id);if(result.error)setError(result.error);else router.refresh();}catch{setError("Could not confirm the withdrawal record. Stop use now, and reload to check the record.");}finally{setPending(false);}
  }
  return <div className="space-y-4 print:hidden"><button className="rounded-xl border bg-white p-4 font-bold" onClick={()=>window.print()}>Print / save signed copy as PDF</button>
  <p>Give the participant a copy before they leave. This page is private and cannot be opened by someone without admin access.</p>
  {!withdrawn && <button disabled={pending} onClick={withdraw} className="rounded-xl border border-red-300 p-4 font-bold text-red-800">{pending?"Recording…":"Record participant’s withdrawal"}</button>}
  {error && <p role="alert">{error}</p>}
  <section className="rounded-xl bg-amber-50 p-5"><h2 className="font-bold">When someone withdraws</h2><p className="mt-2">Recording withdrawal here does not switch off advertisements automatically. Stop new use immediately, pause live ads, remove the testimonial from the website and social channels you control, and tell anyone managing the material. Make reasonable removal requests for third-party copies and confirm the steps taken with the participant.</p></section>
  </div>;
}
