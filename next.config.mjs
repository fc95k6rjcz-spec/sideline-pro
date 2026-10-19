/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Short links for ads and social bios:
  //   /demo        → the live Harbor View multi-sport demo club
  //   /book-a-demo → the homepage's demo request form
  async redirects() {
    return [
      { source: "/demo", destination: "https://harbor-view-demo.vercel.app/demo", permanent: false },
      { source: "/book-a-demo", destination: "/#contact", permanent: false },
    ]
  },
}

export default nextConfig
