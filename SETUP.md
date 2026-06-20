# Sideline Pro — Admin Setup

This site has a private `/admin` area for invoice generation and receipt uploads. Two accounts are authorised: Justin and Rowan. Anyone else who tries to sign in will be bounced. The public coming-soon page at `/` is unaffected.

## What was added

```
lib/
  auth.ts                       email allowlist
  supabase/
    client.ts                   browser Supabase client
    server.ts                   server Supabase client
    middleware.ts               session refresh + admin gate
middleware.ts                   wires middleware into Next
app/
  components/Logo.tsx           shared logo (used by /login and /admin)
  login/
    page.tsx                    /login (email + password)
    LoginForm.tsx
  auth/signout/route.ts         POST /auth/signout
  admin/
    layout.tsx                  protected shell (re-checks auth server-side)
    AdminNav.tsx
    page.tsx                    /admin dashboard
    invoice/
      page.tsx                  /admin/invoice
      InvoiceClient.tsx         form + live preview + jsPDF
    receipts/
      page.tsx                  /admin/receipts
      ReceiptsClient.tsx        drag/drop + list
  api/receipts/
    upload/route.ts             POST → Vercel Blob put()
    list/route.ts               GET  → Vercel Blob list()
```

## Required environment variables

Add these to `.env.local` for development, and to the Vercel project settings (Production + Preview) for deploy:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=sb_secret_XXXXXXXX
ADMIN_EMAILS=jcaruana888@gmail.com,rowan111@gmail.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXX

# Resend — used by /api/invoices/send to email a generated invoice
# (PDF attached) to the client. If RESEND_API_KEY is unset, the form's
# "Send on download" checkbox + the Send/Resend button in the ledger
# will return a 500. The other two vars are optional.
RESEND_API_KEY=re_XXXXXXXX
RESEND_FROM_EMAIL=Sideline Pro <invoices@sidelinepro.com.au>
RESEND_REPLY_TO=hello@sidelinepro.com.au
```

> `ADMIN_EMAILS` is comma-separated. If unset, the app falls back to the hardcoded list in `lib/auth.ts` — update Rowan's email there too once confirmed.

> `RESEND_FROM_EMAIL` defaults to `Sideline Pro <onboarding@resend.dev>` (Resend's shared sandbox sender). That works for testing but is rate-limited and bad for deliverability. For production, verify the `sidelinepro.com.au` domain in the Resend dashboard (Domains → Add → follow DNS instructions) and switch this var to a `@sidelinepro.com.au` address.

## One-time setup

### 1. Supabase

Done — project `SidelinePro_Website` lives at `https://lvfybixzumlmiqckbbtj.supabase.co`. Two users created in Auth: `jcaruana888@gmail.com`, `rowan111@gmail.com`, both auto-confirmed.

### 2. Vercel Blob

Not yet set up. Receipts upload will fail until this is done.

1. In the Vercel dashboard, open the `sideline-pro` project.
2. Go to **Storage → Create database → Blob**, give it a name (e.g. `sideline-pro-blob`), and connect it.
3. Vercel will automatically inject `BLOB_READ_WRITE_TOKEN` into the deploy. For local dev, copy that token from **Storage → Blob → .env.local tab** into your local `.env.local`.

### 3. Install dependencies and run

```bash
pnpm install
pnpm run dev
```

Visit http://localhost:3000/admin — you'll be redirected to `/login`. Sign in with either authorised email, and you're in.

## How auth works

- The coming-soon page at `/` is unaffected — the middleware matcher excludes it.
- `middleware.ts` runs Supabase's session refresh on `/login`, `/admin/*`, `/auth/*`, and `/api/receipts/*`.
- Any request to `/admin/*` checks the user is signed in AND on the email allowlist. Non-allowlisted users are signed out and bounced to `/login?error=not_allowed`.
- `/admin/layout.tsx` re-checks the same conditions server-side as a belt-and-braces guard.
- `/api/receipts/*` endpoints check auth too, so even direct API calls require a valid session.

## How invoices work

`/admin/invoice` is a single page with a form on the left, live preview on the right. "Download PDF" generates a branded PDF entirely in the browser using `jsPDF` + `jspdf-autotable` — nothing is sent to a server, nothing is stored. If you want invoice history later, we'll add a Supabase table and a save step.

## How receipts work

`/admin/receipts` lets each user drag-and-drop files. Uploads go to Vercel Blob under `receipts/<user-email>/<timestamp>-<filename>`. The list view shows only the current user's uploads. Each blob is public-readable via its URL (anyone with the URL can view it) — if you need private blobs, switch `access: "public"` to `"private"` in `app/api/receipts/upload/route.ts` and we'll add signed-URL fetching.

## Updating the allowlist later

Edit the `ADMIN_EMAILS` env var (recommended) or `FALLBACK_ALLOWLIST` in `lib/auth.ts`. No code redeploy needed if you only change the env var on Vercel.
