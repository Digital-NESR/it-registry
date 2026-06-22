import { NextResponse } from "next/server";
import { ensureSchema, getAnalytics } from "@/lib/db";
import { requireAdmin } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getAnalytics());
}
