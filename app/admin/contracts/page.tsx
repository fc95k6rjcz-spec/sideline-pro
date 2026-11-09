import { CUSTOMER_TERMS_DRAFT, SHAREHOLDERS_DRAFT } from "@/lib/contracts/drafts";
import { ONBOARDING_TEXT } from "@/lib/contracts/onboarding";

export const metadata = { title: "Agreements & onboarding — SidelinePro", robots: { index: false, follow: false } };

export default function ContractsPage() {
  return <div className="mx-auto max-w-4xl text-[#112f40]">
    <a href="/admin" className="underline">← Admin dashboard</a>
    <header className="my-6 rounded-3xl bg-[#e5f5ef] p-6 sm:p-9">
      <p className="text-sm font-bold uppercase tracking-widest text-[#007d73]">Company & customer agreements</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Clear agreements. A smoother start.</h1>
      <p className="mt-4 leading-relaxed">Your private review pack: equal ownership for Justin and Rowan, draft customer terms, and the club onboarding checklist recovered from the Queenscliff work.</p>
      <p className="mt-4 rounded-xl bg-white p-4 font-semibold">The two agreements are discussion drafts, not ready to sign or active customer terms. Settle the highlighted decisions and obtain Australian legal review before issue.</p>
    </header>
    <nav aria-label="Agreement sections" className="my-6 flex flex-wrap gap-4 underline">
      <a href="#shareholders">Shareholders agreement</a><a href="#customer">Customer terms</a><a href="#onboarding">Club requirements</a>
    </nav>
    <div className="mb-8 rounded-2xl border border-[#c8e5dc] p-6">
      <h2 className="text-xl font-bold">Using the checklist with a proposal</h2>
      <p className="mt-3 leading-relaxed">In Prospects, open a club’s proposal editor and choose “Add club onboarding requirements”. Review the text, save the proposal and share it when ready. The customer will see the requirements and a separate unchecked acknowledgement before accepting. Their acknowledgement is retained with the acceptance record.</p>
      <p className="mt-3 leading-relaxed">This does not insert these draft legal terms or change any previously accepted proposal. Confirm applicable requirements and delivery dates with each club. Acknowledging the list does not mark the work complete.</p>
      <a href="/admin/prospects" className="mt-4 inline-block font-bold text-[#007d73] underline">Open prospects →</a>
    </div>
    {[
      ["shareholders", "Justin & Rowan · shareholders agreement", SHAREHOLDERS_DRAFT],
      ["customer", "New customers · service terms", CUSTOMER_TERMS_DRAFT],
      ["onboarding", "What we need from each club", ONBOARDING_TEXT],
    ].map(([id, title, text]) => <section id={id} key={id} className="mb-8 scroll-mt-24 rounded-2xl border border-[#c8e5dc] p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="my-3 text-sm text-slate-600">Select and copy the text below into your working document. Changes to that document do not automatically change website terms.</p>
      <textarea aria-label={title} readOnly value={text} rows={24} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 focus:outline-2 focus:outline-[#008c80]" />
    </section>)}
    <p className="text-sm text-slate-600">Source checklist: Queenscliff-onboarding-requirements.md. Club-specific contacts and launch dates have been removed; payment onboarding and secure access guidance have been added.</p>
  </div>;
}
