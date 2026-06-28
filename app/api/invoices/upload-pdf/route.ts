import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

function yearFolder() {
  return String(new Date().getFullYear());
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
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

  // invoices/<year>/<filename> — overwrites on re-download of same invoice #
  const path = `invoices/${yearFolder()}/${sanitize(filename)}`;

  try {
    // Vercel Blob store on this project is configured as PRIVATE — match it
    // here. Public was throwing: "Cannot use public access on a private store".
    // The TS types currently only declare "public" as a literal, but the API
    // accepts "private" at runtime when the store is private; cast through
    // unknown to bypass the compile-time check.
    const blob = await put(path, request.body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
    } as unknown as Parameters<typeof put>[2]);
    return NextResponse.json(blob);
  } catch (err) {
    console.error("Invoice PDF upload failed", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
