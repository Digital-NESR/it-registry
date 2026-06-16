import { NextResponse } from "next/server";
import { ensureSchema, getApp, updateApp, deleteApp } from "@/lib/db";
import { fieldKeys, today } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickFields(body) {
  const rec = {};
  for (const k of ["name", ...fieldKeys]) rec[k] = body[k] ?? "";
  return rec;
}
function deriveAlias(name) {
  return String(name || "").split(/[\s(]/)[0].toUpperCase().slice(0, 6);
}
const parseId = (params) => Number(params?.id);

// GET /api/apps/:id — one application
export async function GET(_req, { params }) {
  try {
    const id = parseId(params);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    const app = await getApp(id);
    return app
      ? NextResponse.json(app)
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/apps/:id — update / resubmit an existing application
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
    // TODO(auth): derive submittedBy from the authenticated session.
    rec.approvalStatus = body.asDraft ? "Draft" : "Pending";
    rec.submittedBy = body.me || existing.submittedBy || "Unknown";
    rec.submittedDate = today;
    rec.approvedBy = "";
    rec.decisionDate = "";
    rec.decisionNote = "";

    return NextResponse.json(await updateApp(id, rec));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/apps/:id
export async function DELETE(_req, { params }) {
  try {
    const id = parseId(params);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    const ok = await deleteApp(id);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
