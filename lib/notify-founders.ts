/**
 * One-line "something happened" email to the founders, via Resend.
 *
 * Same wiring as the demo-request notifier in app/api/contact/route.ts:
 * RESEND_API_KEY, RESEND_FROM_EMAIL and CONTACT_NOTIFY_EMAIL (comma
 * separated; defaults to both founders). Best-effort — a missing key or a
 * failed send is logged and swallowed so the thing that happened (an
 * accepted proposal, say) is never undone by the email about it.
 */
export async function notifyFounders(args: {
  subject: string;
  text: string;
  replyTo?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify-founders] RESEND_API_KEY not set — no email sent:", args.subject);
    return false;
  }
  const from = process.env.RESEND_FROM_EMAIL ?? "Sideline Pro <onboarding@resend.dev>";
  const to = (process.env.CONTACT_NOTIFY_EMAIL ?? "justin@sidelinepro.com.au,rowan@sidelinepro.com.au")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        subject: args.subject,
        text: args.text,
      }),
    });
    if (!res.ok) {
      console.error("[notify-founders] Resend failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify-founders] Resend threw", err);
    return false;
  }
}
