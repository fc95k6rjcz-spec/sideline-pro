import { NextResponse, type NextRequest } from "next/server";
import { applyImport } from "@/lib/crm/apply-import";
import { countDecisions, type RowPlan } from "@/lib/crm/import";
import { bad, db, errorMessage, requireAdmin, unauthorized } from "@/lib/crm/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Commit a reviewed import plan (built and reviewed in /admin/crm/import).
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return unauthorized();
  let body: { rows?: RowPlan[]; filename?: string; sourceLabel?: string; mapping?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  if (!Array.isArray(body.rows) || !body.rows.length) return bad("Nothing to import");
  if (body.rows.length > 5000) return bad("Import at most 5,000 rows at a time");
  const open = countDecisions(body.rows);
  if (open) return bad(`${open} decision${open === 1 ? "" : "s"} still need reviewing before importing`);

  try {
    const result = await applyImport(
      db(),
      { rows: body.rows },
      {
        filename: typeof body.filename === "string" ? body.filename : null,
        sourceLabel: typeof body.sourceLabel === "string" && body.sourceLabel.trim() ? body.sourceLabel.trim() : null,
        mapping: body.mapping ?? {},
        actor: user.email,
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    return bad(errorMessage(err, "Import failed"), 500);
  }
}
