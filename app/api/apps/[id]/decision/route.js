import { NextResponse } from "next/server";
import { ensureSchema, getApp, updateApp, logAudit } from "@/lib/db";
import { getActor } from "@/lib/identity";
import { today, headOfIT } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/apps/:id/decision — approve or reject a pending application
export async function POST(req, { params }) {
  try {
    const id = Number(params?.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { decision, note, approver } = await req.json();
    if (!["Approved", "Rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'Approved' or 'Rejected'" }, { status: 400 });
    }

    await ensureSchema();
    const app = await getApp(id);
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // TODO(auth): once auth is wired in (see lib/auth.js), require the caller
    // to hold the "Head of IT" role here rather than trusting `approver`.
    const rec = { ...app };
    delete rec.id;
    rec.approvalStatus = decision;
    rec.approvedBy = approver || headOfIT;
    rec.decisionDate = today;
    rec.decisionNote = note || "";
    if (decision === "Approved" && rec.status === "Under Development") rec.status = "Active";

    const saved = await updateApp(id, rec);
    const actor = await getActor(approver);
    await logAudit({ ...actor, action: decision === "Approved" ? "application.approve" : "application.reject",
      entityType: "application", entityId: id,
      summary: `${actor.actorName} ${decision === "Approved" ? "approved" : "rejected"} “${app.name}”${note ? ` — ${note}` : ""}` });
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
