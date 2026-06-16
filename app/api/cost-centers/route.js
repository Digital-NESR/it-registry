import { NextResponse } from "next/server";
import { ensureSchema, listCostCenters } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/cost-centers — the full cost-centre mapping (for the cascading picker)
export async function GET() {
  try {
    await ensureSchema();
    return NextResponse.json(await listCostCenters());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
