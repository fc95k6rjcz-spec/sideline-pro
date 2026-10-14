import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Admin: attach the designed proposal PDF to a proposal. Stored in the
 * project's Blob store as proposals/<year>/<file>; the returned URL goes
 * into `proposals.pdf_url` and the public page links to it.
 *
 * The store is public-read by URL (the URL carries a random suffix, so it is
 * as private as the proposal link itself) — a club needs to open it without
 * signing in to anything.
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filename = request.nextUrl.searchParams.get("filename");
  if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  if (!request.body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const path = `proposals/${new Date().getFullYear()}/${sanitize(filename)}`;
  try {
    const blob = await put(path, request.body, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    console.error("Proposal PDF upload failed", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
