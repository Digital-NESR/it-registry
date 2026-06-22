import { NextResponse } from "next/server";
import { ensureSchema, listAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  await ensureSchema();
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const rows = await listAudit({
    limit: Math.min(Number(searchParams.get("limit")) || 150, 500),
    action: searchParams.get("action") || undefined,
    actor: searchParams.get("actor") || undefined,
  });
  return NextResponse.json(rows);
}
