import { NextResponse } from "next/server";
import { ensureSchema, getApp, updateApp, deleteApp, reconcileLinks, logAudit } from "@/lib/db";
import { getActor } from "@/server/identity";
import { today } from "@/lib/schema";
import { pickFields, deriveAlias } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseId = (params) => Number(params?.id);

// GET /api/apps/:id
export async function GET(_req, { params }) {
  try {
    const id = parseId(params);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    const app = await getApp(id);
    return app ? NextResponse.json(app) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/apps/:id — update / resubmit
export async function PUT(req, { params }) {
  try {
    const id = parseId(params);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    const existing = await getApp(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const rec = pickFields(body);
    if (!String(rec.name).trim()) {
      return NextResponse.json({ error: "Application name is required" }, { status: 400 });
    }
    if (!rec.alias) rec.alias = deriveAlias(rec.name);
    rec.appId = rec.appId || existing.appId;
    if (!rec.status) rec.status = "Under Development";

    // Editing/resubmitting resets the approval workflow.
    rec.approvalStatus = body.asDraft ? "Draft" : "Pending";
    rec.submittedBy = body.me || existing.submittedBy || "Unknown";
    rec.submittedDate = today;
    rec.approvedBy = "";
    rec.decisionDate = "";
    rec.decisionNote = "";

    const saved = await updateApp(id, rec);
    await reconcileLinks(saved);
    const actor = await getActor(req, body.me);
    await logAudit({ ...actor, action: "application.update", entityType: "application", entityId: id,
      summary: `${actor.actorName} updated “${saved.name}”` });
    return NextResponse.json(await getApp(id));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/apps/:id
export async function DELETE(req, { params }) {
  try {
    const id = parseId(params);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    // Clear this app from others' link lists before removing it.
    const existing = await getApp(id);
    if (existing) { existing.upstreamSystems = []; existing.downstreamSystems = []; await reconcileLinks(existing); }
    const ok = await deleteApp(id);
    if (ok) {
      const actor = await getActor(req);
      await logAudit({ ...actor, action: "application.delete", entityType: "application", entityId: id,
        summary: `${actor.actorName} deleted “${existing?.name || id}”` });
    }
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
