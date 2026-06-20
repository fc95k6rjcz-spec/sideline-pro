import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only run Supabase session refresh + admin gate on routes that need it.
  // The coming-soon homepage and public marketing/api routes are untouched.
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname === "/login" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/receipts");

  if (!needsAuth) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match only the routes the admin area needs. The root coming-soon
     * page, /api/contact, /api/waitlist and all other public routes are
     * excluded so middleware does not run on them.
     */
    "/login",
    "/admin/:path*",
    "/auth/:path*",
    "/api/receipts/:path*",
  ],
};
