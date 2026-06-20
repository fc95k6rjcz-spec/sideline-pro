import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";

export const runtime = "nodejs";

function safeFolder(email: string) {
  return email.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folder = safeFolder(user.email ?? "unknown");

  try {
    const { blobs } = await list({ prefix: `receipts/${folder}/` });
    // Sort newest first
    blobs.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    return NextResponse.json({ blobs });
  } catch (err) {
    console.error("Blob list failed", err);
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
