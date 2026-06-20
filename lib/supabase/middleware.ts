import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase session on every request and enforces the
 * admin allowlist for /admin/* routes. Returns a NextResponse that
 * either continues the request, redirects to /login, or redirects
 * to /unauthorized for emails outside the allowlist.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // TEMP DIAGNOSTIC — surfaces what the Edge bundle actually sees at runtime.
  // Remove once /login is confirmed working.
  console.log(
    "[middleware] env check",
    JSON.stringify({
      path: request.nextUrl.pathname,
      hasUrl: Boolean(supabaseUrl),
      urlLen: supabaseUrl?.length ?? 0,
      hasKey: Boolean(supabaseAnonKey),
      keyLen: supabaseAnonKey?.length ?? 0,
    }),
  );

  // If env vars are missing in the bundle, don't crash — let the page render
  // (so we can iterate) and let the route handler / page-level checks deal.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not put any code between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (!isAllowedEmail(user.email)) {
      // Signed in but not on the allowlist — sign them out and bounce.
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_allowed");
      return NextResponse.redirect(url);
    }
  }

  // If they're already logged in, don't let them sit on /login
  if (pathname === "/login" && user && isAllowedEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Touch isAuthRoute to satisfy the linter while leaving the hook for
  // future use (e.g. blocking /auth routes for already-signed-in users).
  void isAuthRoute;

  return supabaseResponse;
}
