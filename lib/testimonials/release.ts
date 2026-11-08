import { z } from "zod";
export const RELEASE_VERSION = "2026-11-09-v1";
export const releaseParagraphs = [
  ["Your choice", "Taking part is entirely voluntary. You can decline, skip a question, pause or stop filming at any time. Saying no or withdrawing will not affect your club involvement or access to SidelinePro services."],
  ["What you are agreeing to", "I allow SidelinePro to record my testimonial (video, photographs and audio) and use my contribution, name and role to promote SidelinePro on its website, social media, paid online advertising and presentations. I understand this may be seen worldwide. No payment is promised by this form. This permission covers me only, not any other person or child."],
  ["Honest editing", "SidelinePro may shorten, caption and format the recording, but must preserve the meaning of my comments and not imply an endorsement I did not give. This permission does not cover cloning my voice, creating an AI version of me or inventing words for me."],
  ["You can withdraw at any time", "I can change my mind at any time, without a fee or explanation. I can tell Justin Caruana directly or email rowan@sidelinepro.com.au with my name and a description or link to the testimonial. SidelinePro will stop new use immediately after receiving my request and promptly stop paid advertisements and remove the material from channels it controls. I do not need to log in or use a special form to withdraw."],
  ["Copies already shared", "SidelinePro cannot guarantee removal of independent reposts, search-engine caches or material already distributed by others, but will make reasonable removal requests where possible. Withdrawal does not undo use that occurred before my request."],
  ["Your personal details", "SidelinePro collects my name, date of birth and signature to identify this consent and check that I am an adult. My date of birth and signature will not be used in advertising. The consent record is held in SidelinePro’s restricted administration system and its hosting/database services, accessible to authorised administrators. It is kept while the testimonial is used and as reasonably needed to record permission or withdrawal, then reviewed for deletion. I can request a copy, correction or deletion at rowan@sidelinepro.com.au; a limited record may need to be retained to honour withdrawal or meet legal obligations."],
  ["Electronic signature", "By typing my full name as my signature and selecting ‘Sign and save my consent’, I confirm that I am at least 18, have read and understood this form, had the opportunity to ask questions, and voluntarily agree. I agree to sign electronically, and SidelinePro accepts this electronic signature. I can receive a copy of my signed form."],
] as const;
export const releaseText = releaseParagraphs.map(([title, text]) => `${title}\n${text}`).join("\n\n");
export function isAdult(dob: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const parsed = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dob) return false;
  const date = new Intl.DateTimeFormat("en-CA", {timeZone:"Australia/Sydney",year:"numeric",month:"2-digit",day:"2-digit"}).format(today);
  const [year, month, day] = date.split("-").map(Number);
  const [birthYear, birthMonth, birthDay] = dob.split("-").map(Number);
  const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
  return age >= 18 && age <= 120;
}
export const releaseSchema = z.object({
  id: z.string().uuid(), fullName: z.string().trim().min(2).max(150),
  dob: z.string().refine(value => isAdult(value), "This form is for adults aged 18 and over. For a child, arrange a separate guardian consent process."),
  role: z.string().trim().max(150), signature: z.string().trim().min(2).max(150),
  consent: z.literal(true), version: z.literal(RELEASE_VERSION),
}).refine(v => v.fullName.toLocaleLowerCase().replace(/\s+/g," ") === v.signature.toLocaleLowerCase().replace(/\s+/g," "), {message:"Please sign using the same full name entered above.",path:["signature"]});
