/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force NEXT_PUBLIC_* values to be inlined into every bundle (including
  // the Edge middleware), so /login and /admin/* don't 500 when Turbopack
  // skips them. Required for Next 16 + Turbopack on Vercel.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // sidelinepro.com.au/demo shows the Harbor View demo club in place: the
  // demo app (harbor-view-demo repo) is built with basePath "/demo", and
  // everything under /demo here is fetched from that deployment, so the
  // address bar stays on sidelinepro.com.au. HARBOR_VIEW_ORIGIN overrides
  // the target for local testing.
  async rewrites() {
    // Keep this review branch connected to the matching demo preview.
    // Main/production continues using the live demo origin.
    const reviewDemo = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feature/coach-report-showcase"
      ? "https://harbor-view-demo-git-feature-u-4f58cb-fc95k6rjcz-specs-projects.vercel.app"
      : "https://harbor-view-demo.vercel.app"
    const demo = process.env.HARBOR_VIEW_ORIGIN || reviewDemo
    return [
      { source: "/demo", destination: `${demo}/demo` },
      { source: "/demo/:path*", destination: `${demo}/demo/:path*` },
    ]
  },
  // /book-a-demo → the homepage's demo request form.
  async redirects() {
    return [{ source: "/book-a-demo", destination: "/#contact", permanent: false }]
  },
}

export default nextConfig
