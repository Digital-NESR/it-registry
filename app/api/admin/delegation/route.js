import { NextResponse } from "next/server";
import { ensureSchema, getApprover, setDelegation, logAudit } from "@/lib/db";
import { requireAdmin, getActor } from "@/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() { await ensureSchema(); const a = await requireAdmin(); return a.ok; }

// GET /api/admin/delegation — current approver + active/scheduled delegation
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getApprover());
}

// POST /api/admin/delegation — set/clear time-bound delegation
// body: { delegateEmail, start, end }  (empty delegateEmail clears it)
export async function POST(req) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { delegateEmail, start, end } = await req.json();
    const actor = await getActor(req);
    const result = await setDelegation({ delegateEmail: delegateEmail || null, start: start || null, end: end || null }, actor.actorEmail || "admin");
    await logAudit({ ...actor, action: "delegation.set", entityType: "delegation", entityId: result?.email,
      summary: delegateEmail
        ? `${actor.actorName} delegated approvals to ${delegateEmail}${start || end ? ` (${start || "…"} → ${end || "…"})` : ""}`
        : `${actor.actorName} cleared approval delegation` });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
