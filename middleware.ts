import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/*
 * Free visit log: one row per real page load in `site_page_views`, written
 * in the background so it never slows a page (same approach as the club
 * app's demo_page_views). Visitor = short hash of IP + user agent, no
 * cookie. Justin and Rowan opt out once per browser with `?me=1`.
 * Counts document loads only: link prefetches, in-app RSC navigations,
 * API calls, static files and bots are skipped. /demo/* is counted here
 * too, because middleware runs before the rewrite to the demo site.
 */
const BOT_UA = /bot|crawl|spider|preview|slurp|facebookexternalhit|vercel|headless|lighthouse|monitor/i;

async function logView(request: NextRequest): Promise<void> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !key) return;
  const url = request.nextUrl;
  const ua = request.headers.get("user-agent") ?? "";
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${ua}`));
  const visitor = Array.from(new Uint8Array(digest).slice(0, 5))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const decode = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  let referrer: string | null = null;
  try {
    const ref = request.headers.get("referer");
    if (ref) {
      const host = new URL(ref).hostname;
      if (host && !host.endsWith("sidelinepro.com.au")) referrer = host;
    }
  } catch {
    referrer = null;
  }
  await fetch(`${supaUrl}/rest/v1/site_page_views`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      visitor,
      path: url.pathname,
      referrer,
      utm_source: url.searchParams.get("utm_source"),
      city: decode(request.headers.get("x-vercel-ip-city")),
      country: request.headers.get("x-vercel-ip-country"),
      device: /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop",
      is_owner: request.cookies.get("sp_owner")?.value === "1",
    }),
  }).catch(() => undefined);
}

function isPageLoad(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  const h = request.headers;
  const isPrefetch =
    h.get("next-router-prefetch") === "1" || h.get("purpose") === "prefetch" || (h.get("sec-purpose") ?? "").includes("prefetch");
  const isDocument = h.get("sec-fetch-dest") === "document" || (!h.get("rsc") && (h.get("accept") ?? "").includes("text/html"));
  return !isPrefetch && isDocument && !BOT_UA.test(h.get("user-agent") ?? "");
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname, searchParams } = request.nextUrl;

  const needsAuth =
    pathname === "/login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/receipts");

  if (needsAuth) {
    // Admin pages are never counted as visits.
    return await updateSession(request);
  }

  if (searchParams.get("me") === "1") {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("me");
    const res = NextResponse.redirect(clean, { status: 307 });
    res.cookies.set("sp_owner", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }

  if (!pathname.startsWith("/api/") && isPageLoad(request)) {
    event.waitUntil(logView(request));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next's assets and plain files (anything with a dot,
     * e.g. logo.png, robots.txt). The admin gate above still only applies
     * to /login, /admin, /auth and /api/receipts.
     */
    "/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
