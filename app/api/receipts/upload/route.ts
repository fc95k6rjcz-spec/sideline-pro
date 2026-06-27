import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

function yearMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  // Auth check
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = request.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }
  if (!request.body) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }

  // Shared folder model: receipts/<year>/<month>/<timestamp>-<filename>
  const path = `receipts/${yearMonth()}/${Date.now()}-${sanitizeFilename(filename)}`;

  try {
    // The Vercel Blob store on this project is configured as PRIVATE,
    // so the access mode must match. (Public was throwing:
    //   "Cannot use public access on a private store")
    // @vercel/blob's TypeScript types currently only declare "public" as a literal,
    // but the API accepts "private" at runtime when the store is private — so we
    // cast to bypass the compile-time check.
    const blob = await put(path, request.body, {
      access: "private",
      addRandomSuffix: false,
    } as unknown as Parameters<typeof put>[2]);
    // Returned shape: { url, pathname, contentType, contentDisposition }
    return NextResponse.json(blob);
  } catch (err) {
    console.error("Blob upload failed", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
