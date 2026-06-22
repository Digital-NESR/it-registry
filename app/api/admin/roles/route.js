import { NextResponse } from "next/server";
import { ensureSchema, listRoles, setRole, logAudit } from "@/lib/db";
import { requireAdmin, getActor } from "@/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() { await ensureSchema(); const a = await requireAdmin(); return a.ok; }

// GET /api/admin/roles — list all users & roles
export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await listRoles());
}

// POST /api/admin/roles — set a user's role { email, role }
export async function POST(req) {
  if (!(await guard())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { email, role } = await req.json();
    if (!email || !role) return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    const actor = await getActor();
    await setRole(email, role, actor.actorEmail || "admin");
    await logAudit({ ...actor, action: "role.update", entityType: "user", entityId: email,
      summary: `${actor.actorName} set ${email} → ${role}` });
    return NextResponse.json(await listRoles());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
